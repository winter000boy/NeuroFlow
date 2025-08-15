export interface WorkflowExecutionDTO {
  id: number;
  workflowId: number;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  createdAt: Date;
}

export interface CreateExecutionDTO {
  workflowId: number;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
}
