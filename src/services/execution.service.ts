import { executionRepository } from '../repositories';
// Optionally import axios or n8n SDK to trigger workflows via HTTP
import axios from 'axios';
import { N8N_CONFIG } from '../config';

export const trigger = async (workflowId: number, payload: Record<string, unknown>) => {
  // Call n8n webhook to execute workflow
  await axios.post(`${N8N_CONFIG.baseUrl}/webhook/${workflowId}`, payload);

  // Save execution record in DB
  return executionRepository.create({ workflowId, status: 'PENDING' });
};

export const getStatus = async (id: number) => {
  const execution = await executionRepository.findById(id);
  if (!execution) throw new Error('Execution not found');
  return execution;
};
