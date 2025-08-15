import { ExecutionStatus } from '../../generated/prisma';

export interface ExecutionDTO {
  id: string;
  workflowId: string;
  userId: string;
  status: ExecutionStatus;
  startedAt: Date;
  finishedAt?: Date;
  inputData?: any;
  outputData?: any;
  errorMessage?: string;
  n8nExecutionId?: string;
}

export interface CreateExecutionDTO {
  workflowId: string;
  userId: string;
  status?: ExecutionStatus;
  inputData?: any;
  n8nExecutionId?: string;
}

export interface UpdateExecutionDTO {
  status?: ExecutionStatus;
  finishedAt?: Date;
  outputData?: any;
  errorMessage?: string;
  n8nExecutionId?: string;
}

export interface ExecutionFilterDTO {
  workflowId?: string;
  userId?: string;
  status?: ExecutionStatus;
  startedAfter?: Date;
  startedBefore?: Date;
  finishedAfter?: Date;
  finishedBefore?: Date;
}

export interface ExecutionSortDTO {
  field: 'startedAt' | 'finishedAt' | 'status';
  direction: 'asc' | 'desc';
}

export interface PaginationDTO {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface ExecutionAnalytics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  executionsByStatus: Record<ExecutionStatus, number>;
  executionsByDay: Array<{
    date: string;
    count: number;
    successCount: number;
    failureCount: number;
  }>;
}
