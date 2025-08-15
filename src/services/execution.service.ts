import { executionRepository } from '../repositories';
// Optionally import axios or n8n SDK to trigger workflows via HTTP
import axios from 'axios';
import { N8N_CONFIG } from '../config';

export const trigger = async (workflowId: string, payload: Record<string, unknown>) => {
  // Call n8n webhook to execute workflow
  await axios.post(`${N8N_CONFIG.baseUrl}/webhook/${workflowId}`, payload);

  // Save execution record in DB
  return executionRepository.create({ 
    workflowId, 
    status: 'PENDING',
    userId: 'temp-user-id', // This should come from the authenticated user
    inputData: payload as any,
    outputData: null,
    errorMessage: null,
    n8nExecutionId: null,
    finishedAt: null
  });
};

export const getStatus = async (id: string) => {
  const execution = await executionRepository.findById(id);
  if (!execution) throw new Error('Execution not found');
  return execution;
};
