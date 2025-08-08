import { prisma } from '../config/db.config';
import { WorkflowExecution } from '@prisma/client';

export const create = async (data: Omit<WorkflowExecution, 'id' | 'createdAt'>) => {
  return prisma.workflowExecution.create({ data });
};

export const findById = async (id: number) => {
  return prisma.workflowExecution.findUnique({ where: { id } });
};

export const findAllByWorkflowId = async (workflowId: number) => {
  return prisma.workflowExecution.findMany({ where: { workflowId } });
};

export const updateStatus = async (id: number, status: string) => {
  return prisma.workflowExecution.update({
    where: { id },
    data: { status },
  });
};
