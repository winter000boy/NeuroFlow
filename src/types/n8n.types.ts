import { WorkflowDefinition } from '../schemas/workflow.schema';

// n8n API Response Types
export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: any[];
  connections: Record<string, any>;
  settings?: Record<string, any>;
  staticData?: Record<string, any>;
  tags?: string[];
  versionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface N8nExecution {
  id: string;
  finished: boolean;
  mode: 'manual' | 'trigger' | 'webhook' | 'retry';
  retryOf?: string;
  retrySuccessId?: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  workflowData: {
    id: string;
    name: string;
    active: boolean;
    nodes: any[];
    connections: Record<string, any>;
  };
  data?: {
    resultData: {
      runData: Record<string, any>;
      lastNodeExecuted?: string;
      error?: {
        message: string;
        stack?: string;
        name: string;
      };
    };
    executionData?: {
      contextData: Record<string, any>;
      nodeExecutionStack: any[];
      metadata: Record<string, any>;
    };
  };
}

export interface N8nExecutionResult {
  id: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  data?: {
    resultData: {
      runData: Record<string, any>;
      lastNodeExecuted?: string;
      error?: {
        message: string;
        stack?: string;
        name: string;
      };
    };
  };
}

export interface N8nWebhookPayload {
  executionId: string;
  workflowId: string;
  userId?: string;
  retryOf?: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  data?: {
    resultData: {
      runData: Record<string, any>;
      lastNodeExecuted?: string;
      error?: {
        message: string;
        stack?: string;
        name: string;
      };
    };
  };
}

export interface N8nApiError {
  message: string;
  name: string;
  httpStatusCode?: number;
  errorCode?: string;
  description?: string;
  hint?: string;
}

// Service interfaces
export interface N8nServiceInterface {
  executeWorkflow(workflowDefinition: WorkflowDefinition, inputData?: any): Promise<N8nExecutionResult>;
  getExecution(executionId: string): Promise<N8nExecution>;
  getExecutionStatus(executionId: string): Promise<'running' | 'success' | 'failed' | 'waiting'>;
  cancelExecution(executionId: string): Promise<void>;
  createWorkflow(name: string, definition: WorkflowDefinition): Promise<N8nWorkflow>;
  updateWorkflow(workflowId: string, definition: WorkflowDefinition): Promise<N8nWorkflow>;
  deleteWorkflow(workflowId: string): Promise<void>;
  testConnection(): Promise<boolean>;
}

export interface N8nExecuteWorkflowRequest {
  workflowData: {
    nodes: any[];
    connections: Record<string, any>;
    settings?: Record<string, any>;
  };
  inputData?: Record<string, any>;
}

export interface N8nCreateWorkflowRequest {
  name: string;
  nodes: any[];
  connections: Record<string, any>;
  settings?: Record<string, any>;
  active?: boolean;
}

export interface N8nUpdateWorkflowRequest {
  name?: string;
  nodes?: any[];
  connections?: Record<string, any>;
  settings?: Record<string, any>;
  active?: boolean;
}