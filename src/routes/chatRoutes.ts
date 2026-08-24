import { Router } from 'express';
import {
  getChannels,
  createChannel,
  getMessages,
  sendMessage,
  getOrCreateDM,
  toggleReaction,
  createChannelSchema,
  sendMessageSchema,
} from '../controllers/chatController';
import { authenticateToken } from '../middleware/auth';
import { validateSchema } from '../middleware/validate';

export const chatRouter = Router();

chatRouter.use(authenticateToken);

chatRouter.get('/channels', getChannels);
chatRouter.post('/channels', validateSchema(createChannelSchema), createChannel);
chatRouter.get('/dm/:targetUserId', getOrCreateDM);
chatRouter.get('/channels/:channelId/messages', getMessages);
chatRouter.post('/channels/:channelId/messages', validateSchema(sendMessageSchema), sendMessage);
chatRouter.post('/messages/:messageId/react', toggleReaction);
