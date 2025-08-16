import { ExecutionStatus } from '../../generated/prisma';

// Client to Server Events
export interface ClientToServerEvents {
  'execution:subscribe': (data: { executionId: string }) => void;
  'execution:unsubscribe': (data: { executionId: string }) => void;
  'execution:getLogs': (data: { executionId: string }) => void;
  'workflow:subscribe': (data: { workflowId: string }) => void;
  'workflow:unsubscribe': (data: { workflowId: string }) => void;
  'ping': () => void;
  'reconnect': () => void;
  'connect_error': (error: any) => void;
}

// Server to Client Events
export interface ServerToClientEvents {
  // Execution events
  'execution:started': (data: ExecutionStartedEvent) => void;
  'execution:progress': (data: ExecutionProgressEvent) => void;
  'execution:completed': (data: ExecutionCompletedEvent) => void;
  'execution:failed': (data: ExecutionFailedEvent) => void;
  'execution:status': (data: ExecutionStatusEvent) => void;
  'execution:log': (data: ExecutionLogEvent) => void;

  // Workflow events
  'workflow:execution:started': (data: WorkflowExecutionStartedEvent) => void;
  'workflow:execution:completed': (data: WorkflowExecutionCompletedEvent) => void;

  // System events
  'error': (data: ErrorEvent) => void;
  'pong': () => void;
}

// Event Data Interfaces
export interface ExecutionStartedEvent {
  executionId: string;
  workflowId: string;
  workflowName: string;
  startedAt: Date;
  inputData?: any;
}

export interface ExecutionProgressEvent {
  executionId: string;
  progress: number; // 0-100
  currentStep?: string;
  message?: string;
}

export interface ExecutionCompletedEvent {
  executionId: string;
  workflowId: string;
  status: ExecutionStatus;
  finishedAt: Date;
  outputData?: any;
  duration: number; // in milliseconds
}

export interface ExecutionFailedEvent {
  executionId: string;
  workflowId: string;
  error: string;
  finishedAt: Date;
  duration: number; // in milliseconds
}

export interface ExecutionStatusEvent {
  executionId: string;
  status: ExecutionStatus;
  startedAt: Date;
  finishedAt?: Date;
  progress: number;
  message?: string;
}

export interface ExecutionLogEvent {
  executionId: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
}

export interface WorkflowExecutionStartedEvent {
  workflowId: string;
  executionId: string;
  workflowName: string;
  startedAt: Date;
}

export interface WorkflowExecutionCompletedEvent {
  workflowId: string;
  executionId: string;
  status: ExecutionStatus;
  finishedAt: Date;
  duration: number;
}

export interface ErrorEvent {
  message: string;
  code?: string;
  details?: any;
}

// Room naming conventions
export const WebSocketRooms = {
  user: (userId: string) => `user:${userId}`,
  workflow: (workflowId: string) => `workflow:${workflowId}`,
  execution: (executionId: string) => `execution:${executionId}`,
} as const;