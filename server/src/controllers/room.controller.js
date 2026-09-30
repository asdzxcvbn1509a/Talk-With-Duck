import * as roomService from '../services/room.service.js';
import * as messageService from '../services/message.service.js';
import * as queueService from '../services/queue.service.js';

export const list = async (req, res, next) => {
  try {
    res.json({ rooms: await roomService.listRooms(req.valid.query) });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    res.status(201).json({ room: await roomService.createRoom(req.user, req.valid.body) });
  } catch (err) {
    next(err);
  }
};

export const quickMatch = async (req, res, next) => {
  try {
    res.json({ room: await roomService.quickMatch(req.user, req.valid.body) });
  } catch (err) {
    next(err);
  }
};

export const get = async (req, res, next) => {
  try {
    res.json({ room: await roomService.getRoom(req.valid.params.id) });
  } catch (err) {
    next(err);
  }
};

export const join = async (req, res, next) => {
  try {
    res.json({ room: await roomService.joinRoom(req.valid.params.id, req.user.id) });
  } catch (err) {
    next(err);
  }
};

export const leave = async (req, res, next) => {
  try {
    await roomService.leaveRoom(req.valid.params.id, req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const listMessages = async (req, res, next) => {
  try {
    const messages = await messageService.listMessages(
      req.valid.params.id,
      req.user.id,
      req.valid.query,
    );
    res.json({ messages });
  } catch (err) {
    next(err);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const message = await messageService.sendMessage(
      req.valid.params.id,
      req.user.id,
      req.valid.body,
    );
    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
};

export const getQueue = async (req, res, next) => {
  try {
    res.json({ queue: await queueService.listQueue(req.valid.params.id) });
  } catch (err) {
    next(err);
  }
};

export const addSong = async (req, res, next) => {
  try {
    const queue = await queueService.addSong(req.valid.params.id, req.user.id, req.valid.body);
    res.status(201).json({ queue });
  } catch (err) {
    next(err);
  }
};

export const removeSong = async (req, res, next) => {
  try {
    const { id, songId } = req.valid.params;
    res.json({ queue: await queueService.removeSong(id, req.user.id, songId) });
  } catch (err) {
    next(err);
  }
};

export const nextSong = async (req, res, next) => {
  try {
    res.json({
      queue: await queueService.nextSong(req.valid.params.id, req.user.id, req.valid.body),
    });
  } catch (err) {
    next(err);
  }
};
