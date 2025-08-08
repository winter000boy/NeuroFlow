import { prisma } from '../config/db.config';
import { Workflow } from '@prisma/client';

export const create = async (data: Omit<Workflow, 'id' | 'createdAt'>) => {
  return prisma.workflow.create({ data });
};

export const findById = async (id: number) => {
  return prisma.workflow.findUnique({ where: { id } });
};

export const findAll = async () => {
  return prisma.workflow.findMany();
};

export const update = async (id: number, data: Partial<Workflow>) => {
  return prisma.workflow.update({ where: { id }, data });
};

export const remove = async (id: number) => {
  return prisma.workflow.delete({ where: { id } });
};
