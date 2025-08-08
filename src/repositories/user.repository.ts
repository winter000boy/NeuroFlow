import { prisma } from '../config/db.config';
import { User } from '@prisma/client';

export const create = async (data: Omit<User, 'id' | 'createdAt'>) => {
  return prisma.user.create({ data });
};

export const findByEmail = async (email: string) => {
  return prisma.user.findUnique({ where: { email } });
};

export const findById = async (id: number) => {
  return prisma.user.findUnique({ where: { id } });
};

export const findAll = async () => {
  return prisma.user.findMany();
};
