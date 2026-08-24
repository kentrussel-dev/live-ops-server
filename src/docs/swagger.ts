export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Aetheria Live-Ops Console REST API',
    version: '1.0.0',
    description: 'Enterprise REST API powering live operations, event toggles, versioned patch notes, item rotations, and known issue pipelines for the Aetheria mobile MMORPG.',
    contact: {
      name: 'Live-Ops Infrastructure Team',
      email: 'liveops-support@aetheria.gg',
    },
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide a valid JWT token obtained from `/api/v1/auth/login`.',
      },
    },
    schemas: {
      StandardError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'ERR_VALIDATION_FAILED' },
              message: { type: 'string', example: 'Detailed error explanation.' },
              details: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          username: { type: 'string', example: 'ops_lead' },
          email: { type: 'string', example: 'editor@liveops.aetheria.gg' },
          role: { type: 'string', enum: ['admin', 'liveops_editor', 'readonly_viewer'], example: 'liveops_editor' },
          department: { type: 'string', example: 'Live Operations' },
        },
      },
      GameEvent: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string', example: 'Void Leviathan World Boss Incursion' },
          slug: { type: 'string', example: 'void-leviathan-incursion' },
          description: { type: 'string', example: 'Server-wide cooperative raid battle with 2.5x mythic drop multipliers.' },
          category: { type: 'string', enum: ['raid', 'exp_boost', 'community', 'login_reward', 'pvp_season', 'world_boss', 'maintenance'] },
          status: { type: 'string', enum: ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'] },
          schedule: {
            type: 'object',
            properties: {
              startTime: { type: 'string', format: 'date-time' },
              endTime: { type: 'string', format: 'date-time' },
              timezone: { type: 'string', example: 'UTC' },
              recurrence: { type: 'string', enum: ['none', 'daily', 'weekly', 'monthly'] },
            },
          },
          targeting: {
            type: 'object',
            properties: {
              playerSegments: { type: 'array', items: { type: 'string' } },
              serverClusters: { type: 'array', items: { type: 'string' } },
              minLevel: { type: 'number', example: 50 },
              maxLevel: { type: 'number', example: 100 },
            },
          },
          config: {
            type: 'object',
            properties: {
              expMultiplier: { type: 'number', example: 2.5 },
              dropRateBonusPct: { type: 'number', example: 25 },
              goldBonusPct: { type: 'number', example: 15 },
              specialRules: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
      PatchNote: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          version: { type: 'string', example: 'v2.4.0' },
          clientBuildNumber: { type: 'string', example: '240.108' },
          serverBuildNumber: { type: 'string', example: '240.92' },
          title: { type: 'string', example: 'Siege of the Void Rift Update' },
          summary: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'in_review', 'approved', 'published', 'archived'] },
          targetPublishTime: { type: 'string', format: 'date-time' },
          publishedAt: { type: 'string', format: 'date-time' },
          requiresMaintenance: { type: 'boolean' },
          maintenanceDurationMinutes: { type: 'number' },
          sections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                category: { type: 'string', enum: ['features', 'balance', 'bug_fixes', 'known_issues', 'infrastructure'] },
                items: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      ShopItemRotation: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          itemId: { type: 'string', example: 'WEAPON_VOID_SLAYER_09' },
          name: { type: 'string', example: 'Voidbane Greatsword' },
          category: { type: 'string', enum: ['weapon', 'armor', 'consumable', 'cosmetic', 'mount', 'bundle', 'currency'] },
          rarity: { type: 'string', enum: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] },
          pricing: {
            type: 'object',
            properties: {
              basePrice: { type: 'number', example: 1200 },
              currency: { type: 'string', example: 'gems' },
              discountPct: { type: 'number', example: 25 },
              salePrice: { type: 'number', example: 900 },
            },
          },
          rotationStatus: { type: 'string', enum: ['featured', 'standard', 'flash_sale', 'retired', 'vaulted'] },
          schedule: {
            type: 'object',
            properties: {
              activeFrom: { type: 'string', format: 'date-time' },
              activeUntil: { type: 'string', format: 'date-time' },
              stockLimitPerUser: { type: 'number' },
            },
          },
        },
      },
      IssueTicket: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          ticketKey: { type: 'string', example: 'ISSUE-1042' },
          title: { type: 'string', example: 'Quest "Crest of the Fallen" items stuck at 90%' },
          category: { type: 'string', enum: ['quest', 'loot_table', 'combat_balance', 'client_crash', 'shop_billing', 'server_lag', 'ui_glitch'] },
          severity: { type: 'string', enum: ['critical_blocker', 'major', 'moderate', 'minor'] },
          status: { type: 'string', enum: ['reported', 'investigating', 'fixed', 'verified', 'closed'] },
          affectedCluster: { type: 'string', example: 'NA-East' },
          reproductionSteps: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate and obtain JWT bearer token',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'editor@liveops.aetheria.gg' },
                  password: { type: 'string', example: 'AetheriaOps2026!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authentication successful, returns JWT token' },
          401: { description: 'Invalid email or password' },
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current authenticated user profile',
        responses: {
          200: { description: 'Returns authenticated user details' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/v1/auth/demo-accounts': {
      get: {
        tags: ['Auth'],
        summary: 'Get list of demo accounts for quick role-switching in portfolio review',
        security: [],
        responses: {
          200: { description: 'Returns pre-seeded demo credentials' },
        },
      },
    },
    '/api/v1/events': {
      get: {
        tags: ['Events'],
        summary: 'List in-game events with filtering and pagination',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Comma-separated statuses' },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'serverCluster', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Returns matching events' },
        },
      },
      post: {
        tags: ['Events'],
        summary: 'Create a new game event (Editor / Admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GameEvent' },
            },
          },
        },
        responses: {
          201: { description: 'Event created successfully' },
          403: { description: 'Forbidden for read-only viewers' },
        },
      },
    },
    '/api/v1/events/{id}/toggle': {
      patch: {
        tags: ['Events'],
        summary: 'Fast-toggle live status of an event (active/paused/scheduled)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'] },
                  reason: { type: 'string', example: 'Emergency maintenance override' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Status updated and logged in audit trail' },
        },
      },
    },
    '/api/v1/patches': {
      get: {
        tags: ['Patches'],
        summary: 'List patch notes catalog',
        responses: {
          200: { description: 'Returns patch note list' },
        },
      },
      post: {
        tags: ['Patches'],
        summary: 'Create a draft patch note (Editor / Admin)',
        responses: {
          201: { description: 'Draft created' },
        },
      },
    },
    '/api/v1/patches/{id}/publish': {
      post: {
        tags: ['Patches'],
        summary: 'Publish a patch note to live broadcast network',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Patch published successfully' },
        },
      },
    },
    '/api/v1/shop-rotations': {
      get: {
        tags: ['Shop'],
        summary: 'List item and equipment rotations',
        responses: {
          200: { description: 'Returns active/scheduled catalog' },
        },
      },
    },
    '/api/v1/shop-rotations/batch-rotate': {
      post: {
        tags: ['Shop'],
        summary: 'Batch rotate item statuses (featured, flash sale, retirement)',
        responses: {
          200: { description: 'Items updated successfully' },
        },
      },
    },
    '/api/v1/issues': {
      get: {
        tags: ['Issues'],
        summary: 'List known issues with pipeline metrics',
        responses: {
          200: { description: 'Returns issue tickets and status counts' },
        },
      },
      post: {
        tags: ['Issues'],
        summary: 'Report a new issue ticket',
        responses: {
          201: { description: 'Ticket created' },
        },
      },
    },
    '/api/v1/issues/{id}/status': {
      patch: {
        tags: ['Issues'],
        summary: 'Advance or transition issue pipeline status (reported -> investigating -> fixed -> verified -> closed)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Status updated' },
        },
      },
    },
    '/api/v1/timeline/matrix': {
      get: {
        tags: ['Timeline'],
        summary: 'Unified multi-track operational schedule matrix (Events, Patches, Shop Rotations, Incidents)',
        responses: {
          200: { description: 'Returns aggregated timeline tracks' },
        },
      },
    },
    '/api/v1/system/overview': {
      get: {
        tags: ['System'],
        summary: 'System telemetry, cluster health, player load estimates, and audit logs',
        responses: {
          200: { description: 'Returns system overview' },
        },
      },
    },
  },
};
