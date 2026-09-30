// เส้นทางไปยังห้อง: ห้องคาราโอเกะมีหน้าของตัวเอง
export const roomPath = (room) => {
  return room.type === 'karaoke' ? `/karaoke/${room.id}` : `/room/${room.id}`;
};
