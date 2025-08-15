import { z } from 'zod';
import { WorkflowStatus } from '../../generated/prisma';

// Workflow node schema for n8n workflow definitions
export const WorkflowNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  typeVersion: z.number().optional(),
  position: z.array(z.number()).length(2),
  parameters: z.record(z.any()).optional(),
  credentials: z.record(z.string()).optional(),
});

// Workflow connection schema
export const WorkflowConnectionSchema = z.object({
  node: z.string(),
  type: z.string(),
  index: z.number().optional(),
});

// Workflow definition schema
export const WorkflowDefinitionSchema = z.object({
  nodes: z.array(WorkflowNodeSchema),
  connections: z.record(z.record(z.array(WorkflowConnectionSchema))),
  settings: z.object({
    executionOrder: z.enum(['v0', 'v1']).optional(),
    saveManualExecutions: z.boolean().optional(),
    callerPolicy: z.string().optional(),
    errorWorkflow: z.string().optional(),
    timezone: z.string().optional(),
  }).optional(),
});

// Create workflow schema
export const CreateWorkflowSchema = z.object({
  name: z.string().min(1, 'Workflow name is required').max(255, 'Workflow name too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  definition: WorkflowDefinitionSchema,
  status: z.nativeEnum(WorkflowStatus).optional().default(WorkflowStatus.DRAFT),
});

// Update workflow schema
export const UpdateWorkflowSchema = z.object({
  name: z.string().min(1, 'Workflow name is required').max(255, 'Workflow name too long').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  definition: WorkflowDefinitionSchema.optional(),
  status: z.nativeEnum(WorkflowStatus).optional(),
});

// Query parameters schema
export const WorkflowQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  status: z.nativeEnum(WorkflowStatus).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Workflow ID parameter schema
export const WorkflowParamsSchema = z.object({
  id: z.string().cuid('Invalid workflow ID'),
});

// Export types
export type CreateWorkflowDto = z.infer<typeof CreateWorkflowSchema>;
export type UpdateWorkflowDto = z.infer<typeof UpdateWorkflowSchema>;
export type WorkflowQueryDto = z.infer<typeof WorkflowQuerySchema>;
export type WorkflowParamsDto = z.infer<typeof WorkflowParamsSchema>;
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
export type WorkflowConnection = z.infer<typeof WorkflowConnectionSchema>;