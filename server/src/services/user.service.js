import { prisma } from '../lib/prisma.js';

export const updateProfile = (userId, data) => {
  return prisma.user.update({ where: { id: userId }, data });
};

export const acceptGuidelines = (userId) => {
  return prisma.user.update({ where: { id: userId }, data: { acceptedGuidelinesAt: new Date() } });
};
