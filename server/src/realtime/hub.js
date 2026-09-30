// จุดกลางสำหรับส่ง event ผ่าน Socket.IO จากชั้น service
// (ถ้ายังไม่ได้เริ่ม Socket.IO เช่นตอนรันเทสต์ ทุกฟังก์ชันจะไม่ทำอะไร)

let io = null;

export const setIo = (instance) => {
  io = instance;
};

export const getIo = () => {
  return io;
};

export const channel = {
  lobby: 'lobby',
  moderators: 'moderators',
  room: (roomId) => `room:${roomId}`,
  user: (userId) => `user:${userId}`,
};

export const emitToRoom = (roomId, event, payload) => {
  io?.to(channel.room(roomId)).emit(event, payload);
};

export const emitToLobby = (event, payload) => {
  io?.to(channel.lobby).emit(event, payload);
};

export const emitToUser = (userId, event, payload) => {
  io?.to(channel.user(userId)).emit(event, payload);
};

export const emitToModerators = (event, payload) => {
  io?.to(channel.moderators).emit(event, payload);
};

export const disconnectUser = (userId) => {
  io?.in(channel.user(userId)).disconnectSockets(true);
};
