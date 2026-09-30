import { Router } from 'express';
import * as rooms from '../controllers/room.controller.js';
import { requireAuth, requireGuidelines } from '../middleware/auth.js';
import { chatLimiter, postLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import {
  addSongBody,
  createRoomBody,
  idParam,
  listMessagesQuery,
  listRoomsQuery,
  nextSongBody,
  quickMatchBody,
  sendMessageBody,
  songParams,
} from '../schemas.js';

const router = Router();

router.use(requireAuth, requireGuidelines);

router.get('/', validate({ query: listRoomsQuery }), rooms.list);
router.post('/', postLimiter, validate({ body: createRoomBody }), rooms.create);
router.post('/quick-match', validate({ body: quickMatchBody }), rooms.quickMatch);
router.get('/:id', validate({ params: idParam }), rooms.get);
router.post('/:id/join', validate({ params: idParam }), rooms.join);
router.post('/:id/leave', validate({ params: idParam }), rooms.leave);

router.get(
  '/:id/messages',
  validate({ params: idParam, query: listMessagesQuery }),
  rooms.listMessages,
);
router.post(
  '/:id/messages',
  chatLimiter,
  validate({ params: idParam, body: sendMessageBody }),
  rooms.sendMessage,
);

router.get('/:id/queue', validate({ params: idParam }), rooms.getQueue);
router.post(
  '/:id/queue',
  postLimiter,
  validate({ params: idParam, body: addSongBody }),
  rooms.addSong,
);
router.post('/:id/queue/next', validate({ params: idParam, body: nextSongBody }), rooms.nextSong);
router.delete('/:id/queue/:songId', validate({ params: songParams }), rooms.removeSong);

export default router;
