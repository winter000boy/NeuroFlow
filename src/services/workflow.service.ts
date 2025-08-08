import { workflowRepository } from '../repositories';

export const create = async (data: { name: string; description?: string }) => {
  return workflowRepository.create(data);
};

export const getAll = async () => {
  return workflowRepository.findAll();
};

export const getById = async (id: number) => {
  const workflow = await workflowRepository.findById(id);
  if (!workflow) throw new Error('Workflow not found');
  return workflow;
};

export const update = async (id: number, data: Partial<{ name: string; description: string }>) => {
  return workflowRepository.update(id, data);
};

export const remove = async (id: number) => {
  return workflowRepository.remove(id);
};
