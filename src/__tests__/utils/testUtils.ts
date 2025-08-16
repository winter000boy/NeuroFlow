import { WorkflowStatus, ExecutionStatus } from '../../../generated/prisma';

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  password: 'hashedpassword',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createMockWorkflow = (overrides = {}) => ({
  id: 'workflow-123',
  name: 'Test Workflow',
  description: 'Test workflow description',
  definition: {
    nodes: [
      {
        id: 'node-1',
        name: 'Start',
        type: 'trigger',
        position: [100, 200],
        parameters: {}
      }
    ],
    connections: {}
  },
  status: WorkflowStatus.DRAFT,
  userId: 'user-123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  user: createMockUser(),
  ...overrides,
});

export const createMockExecution = (overrides = {}) => ({
  id: 'execution-123',
  workflowId: 'workflow-123',
  userId: 'user-123',
  status: ExecutionStatus.PENDING,
  startedAt: new Date('2024-01-01'),
  finishedAt: null,
  inputData: { test: 'data' },
  outputData: null,
  errorMessage: null,
  n8nExecutionId: null,
  workflow: createMockWorkflow(),
  user: createMockUser(),
  ...overrides,
});

export const createMockRequest = (overrides = {}) => ({
  user: { userId: 'user-123' },
  params: {},
  query: {},
  body: {},
  headers: {},
  ...overrides,
});

export const createMockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

export const createMockNext = () => jest.fn();

// Helper to wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to create paginated results
export const createPaginatedResult = <T>(items: T[], page = 1, limit = 10, total?: number) => ({
  items,
  meta: {
    page,
    limit,
    total: total ?? items.length,
    totalPages: Math.ceil((total ?? items.length) / limit),
  },
});

// Mock Prisma client methods
export const createMockPrismaClient = () => ({
  workflow: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  execution: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
});

// Mock WebSocket service
export const createMockWebSocketService = () => ({
  isAvailable: jest.fn().mockReturnValue(true),
  emitExecutionStarted: jest.fn(),
  emitExecutionProgress: jest.fn(),
  emitExecutionCompleted: jest.fn(),
  emitExecutionFailed: jest.fn(),
  emitExecutionLog: jest.fn(),
});

// Mock n8n service
export const createMockN8nService = () => ({
  executeWorkflow: jest.fn(),
  getExecutionStatus: jest.fn(),
  createWebhook: jest.fn(),
});

// Mock axios for HTTP requests
export const createMockAxios = () => ({
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
});