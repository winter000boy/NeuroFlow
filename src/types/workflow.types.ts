export interface WorkflowDTO {
  id: number;
  name: string;
  description?: string;
  createdAt: Date;
}

export interface CreateWorkflowDTO {
  name: string;
  description?: string;
}
