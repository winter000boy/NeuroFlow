import { prisma } from '../config/db.config';
import { RefreshToken } from '../../generated/prisma';

export const create = async (data: {
  token: string;
  userId: string;
  expiresAt: Date;
}): Promise<RefreshToken> => {
  return prisma.refreshToken.create({ data });
};

export const findByToken = async (token: string): Promise<RefreshToken | null> => {
  return prisma.refreshToken.findUnique({ 
    where: { token },
    include: { user: true }
  });
};

export const deleteByToken = async (token: string): Promise<void> => {
  await prisma.refreshToken.delete({ where: { token } });
};

export const deleteByUserId = async (userId: string): Promise<void> => {
  await prisma.refreshToken.deleteMany({ where: { userId } });
};

export const deleteExpired = async (): Promise<void> => {
  await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  });
};

export const findByUserId = async (userId: string): Promise<RefreshToken[]> => {
  return prisma.refreshToken.findMany({ where: { userId } });
};