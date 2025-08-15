import { prisma } from '../config/db.config';
import { User } from '../../generated/prisma';

export const create = async (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
  return prisma.user.create({ data });
};

export const findByEmail = async (email: string) => {
  return prisma.user.findUnique({ where: { email } });
};

export const findById = async (id: string) => {
  return prisma.user.findUnique({ where: { id } });
};

export const update = async (id: string, data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>) => {
  return prisma.user.update({
    where: { id },
    data
  });
};

export const deleteById = async (id: string) => {
  return prisma.user.delete({ where: { id } });
};

export const findAll = async () => {
  return prisma.user.findMany();
};
