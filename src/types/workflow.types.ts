import { Workflow, WorkflowStatus } from '../../generated/prisma';
import { WorkflowDefinition, WorkflowQueryDto } from '../schemas/workflow.schema';

export interface WorkflowDto {
  id: string;
  name: string;
  description?: string;
  definition: WorkflowDefinition;
  status: WorkflowStatus;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface CreateWorkflowData {
  name: string;
  description?: string;
  definition: WorkflowDefinition;
  status?: WorkflowStatus;
  userId: string;
}

export interface UpdateWorkflowData {
  name?: string;
  description?: string;
  definition?: WorkflowDefinition;
  status?: WorkflowStatus;
}

export interface WorkflowWithExecutions extends Workflow {
  executions: Array<{
    id: string;
    status: string;
    startedAt: Date;
    finishedAt?: Date;
  }>;
}

export interface PaginatedWorkflows {
  workflows: WorkflowDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Re-export from schema for convenience
export type { WorkflowQueryDto };
