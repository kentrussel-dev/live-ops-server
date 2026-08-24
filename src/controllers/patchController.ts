import { Request, Response, NextFunction } from 'express';
import { PatchNote } from '../models/PatchNote';
import { AuditLog } from '../models/AuditLog';
import { z } from 'zod';

const patchSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.enum(['features', 'balance', 'bug_fixes', 'known_issues', 'infrastructure']),
  items: z.array(z.string()),
});

export const createPatchSchema = z.object({
  body: z.object({
    version: z.string().min(2),
    clientBuildNumber: z.string().min(1),
    serverBuildNumber: z.string().min(1),
    title: z.string().min(3),
    summary: z.string().min(5),
    status: z.enum(['draft', 'in_review', 'approved', 'published', 'archived']).default('draft'),
    targetPublishTime: z.string().datetime(),
    requiresMaintenance: z.boolean().default(false),
    maintenanceDurationMinutes: z.number().min(0).default(0),
    sections: z.array(patchSectionSchema).default([]),
  }),
});

export const updatePatchSchema = z.object({
  body: createPatchSchema.shape.body.partial().extend({
    changeSummary: z.string().optional(),
  }),
});

export async function getPatches(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, search } = req.query;
    const filter: Record<string, any> = {};

    if (status) {
      filter.status = { $in: String(status).split(',') };
    }

    if (search) {
      const searchRegex = new RegExp(String(search), 'i');
      filter.$or = [{ version: searchRegex }, { title: searchRegex }, { summary: searchRegex }];
    }

    const patches = await PatchNote.find(filter).sort({ targetPublishTime: -1 });

    res.json({
      success: true,
      data: { patches },
    });
  } catch (err) {
    next(err);
  }
}

export async function getPatchById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patch = await PatchNote.findById(req.params.id);
    if (!patch) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_PATCH_NOT_FOUND', message: 'Patch note not found.' },
      });
      return;
    }

    res.json({
      success: true,
      data: { patch },
    });
  } catch (err) {
    next(err);
  }
}

export async function createPatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await PatchNote.findOne({ version: req.body.version });
    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'ERR_VERSION_CONFLICT', message: `Patch version '${req.body.version}' already exists.` },
      });
      return;
    }

    const author = req.user?.username || 'system';

    const newPatch = await PatchNote.create({
      ...req.body,
      author,
      diffHistory: [
        {
          version: req.body.version,
          author,
          timestamp: new Date().toISOString(),
          summary: 'Initial draft created',
          snapshotData: JSON.stringify(req.body.sections || []),
        },
      ],
    });

    await AuditLog.create({
      action: 'PATCH_CREATED',
      entityType: 'patch',
      entityId: newPatch._id.toString(),
      performedBy: author,
      userRole: req.user?.role || 'liveops_editor',
      details: `Created patch draft '${newPatch.version}' - '${newPatch.title}'`,
    });

    res.status(201).json({
      success: true,
      data: { patch: newPatch },
    });
  } catch (err) {
    next(err);
  }
}

export async function updatePatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patch = await PatchNote.findById(req.params.id);
    if (!patch) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_PATCH_NOT_FOUND', message: 'Patch note not found.' },
      });
      return;
    }

    const author = req.user?.username || 'system';
    const { changeSummary, ...updateData } = req.body;

    // Append to diffHistory if sections changed
    if (updateData.sections) {
      patch.diffHistory.unshift({
        version: patch.version,
        author,
        timestamp: new Date().toISOString(),
        summary: changeSummary || `Modified patch sections and notes`,
        snapshotData: JSON.stringify(updateData.sections),
      });
    }

    Object.assign(patch, updateData);
    await patch.save();

    await AuditLog.create({
      action: 'PATCH_UPDATED',
      entityType: 'patch',
      entityId: patch._id.toString(),
      performedBy: author,
      userRole: req.user?.role || 'liveops_editor',
      details: `Updated patch note '${patch.version}' (status: ${patch.status})`,
    });

    res.json({
      success: true,
      data: { patch },
    });
  } catch (err) {
    next(err);
  }
}

export async function publishPatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patch = await PatchNote.findById(req.params.id);
    if (!patch) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_PATCH_NOT_FOUND', message: 'Patch note not found.' },
      });
      return;
    }

    patch.status = 'published';
    patch.publishedAt = new Date();
    await patch.save();

    await AuditLog.create({
      action: 'PATCH_PUBLISHED',
      entityType: 'patch',
      entityId: patch._id.toString(),
      performedBy: req.user?.username || 'system',
      userRole: req.user?.role || 'liveops_editor',
      details: `Officially published patch notes for ${patch.version} (${patch.title}) to live game network`,
    });

    res.json({
      success: true,
      data: {
        patch,
        message: `Patch ${patch.version} published successfully. Broadcast dispatched to game clients.`,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function comparePatchDiff(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentId, previousId } = req.params;
    const [current, previous] = await Promise.all([
      PatchNote.findById(currentId),
      PatchNote.findById(previousId),
    ]);

    if (!current || !previous) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_PATCH_NOT_FOUND', message: 'One or both patches could not be found for diff comparison.' },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        currentVersion: {
          id: current._id,
          version: current.version,
          title: current.title,
          status: current.status,
          sections: current.sections,
        },
        previousVersion: {
          id: previous._id,
          version: previous.version,
          title: previous.title,
          status: previous.status,
          sections: previous.sections,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
