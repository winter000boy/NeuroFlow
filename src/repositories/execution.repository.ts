import { prisma } from '../config/db.config';
import { Execution } from '../../generated/prisma';

export const create = async (data: Omit<Execution, 'id' | 'startedAt'>) => {
  return prisma.execution.create({ data });
};

export const findById = async (id: string) => {
  return prisma.execution.findUnique({ where: { id } });
};

export const findAllByWorkflowId = async (workflowId: string) => {
  return prisma.execution.findMany({ where: { workflowId } });
};

export const updateStatus = async (id: string, status: string) => {
  return prisma.execution.update({
    where: { id },
    data: { status },
  });
};
