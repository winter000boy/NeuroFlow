import { workflowRepository } from '../repositories';
import { Workflow, WorkflowStatus } from '../../generated/prisma';
import { 
  CreateWorkflowDto, 
  UpdateWorkflowDto, 
  WorkflowQueryDto,
  WorkflowDefinitionSchema 
} from '../schemas/workflow.schema';
import { 
  CreateWorkflowData, 
  UpdateWorkflowData, 
  PaginatedWorkflows,
  WorkflowDto 
} from '../types/workflow.types';
import { AppError, ErrorCode } from '../utils/errors';
import { logger } from '../config/logger.config';

export class WorkflowService {
  /**
   * Create a new workflow
   */
  async createWorkflow(userId: string, data: CreateWorkflowDto): Promise<Workflow> {
    try {
      // Validate workflow definition
      const validatedDefinition = WorkflowDefinitionSchema.parse(data.definition);
      
      // Sanitize workflow definition
      const sanitizedDefinition = this.sanitizeWorkflowDefinition(validatedDefinition);
      
      const workflowData: CreateWorkflowData = {
        name: data.name.trim(),
        description: data.description?.trim(),
        definition: sanitizedDefinition,
        status: data.status || WorkflowStatus.DRAFT,
        userId,
      };

      const workflow = await workflowRepository.create(workflowData);
      
      logger.info(`Workflow created: ${workflow.id} by user: ${userId}`);
      return workflow;
    } catch (error) {
      logger.error('Error creating workflow:', error);
      if (error instanceof Error && error.name === 'ZodError') {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          'Invalid workflow definition',
          400,
          error.message
        );
      }
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to create workflow',
        500
      );
    }
  }

  /**
   * Get workflow by ID (with user authorization)
   */
  async getWorkflowById(id: string, userId: string): Promise<Workflow> {
    const workflow = await workflowRepository.findByIdAndUserId(id, userId);
    
    if (!workflow) {
      throw new AppError(
        ErrorCode.WORKFLOW_NOT_FOUND,
        'Workflow not found or access denied',
        404
      );
    }

    return workflow;
  }

  /**
   * Get workflow with statistics
   */
  async getWorkflowWithStats(id: string, userId: string): Promise<any> {
    const workflow = await workflowRepository.findByIdWithStats(id, userId);
    
    if (!workflow) {
      throw new AppError(
        ErrorCode.WORKFLOW_NOT_FOUND,
        'Workflow not found or access denied',
        404
      );
    }

    return workflow;
  }

  /**
   * Get user's workflows with pagination and filtering
   */
  async getUserWorkflows(userId: string, query: WorkflowQueryDto): Promise<PaginatedWorkflows> {
    const { workflows, total } = await workflowRepository.findByUserId(userId, query);
    
    const totalPages = Math.ceil(total / query.limit);

    return {
      workflows: workflows.map(this.mapWorkflowToDto),
      total,
      page: query.page,
      limit: query.limit,
      totalPages,
    };
  }

  /**
   * Update workflow
   */
  async updateWorkflow(id: string, userId: string, data: UpdateWorkflowDto): Promise<Workflow> {
    try {
      // Validate workflow definition if provided
      let sanitizedDefinition;
      if (data.definition) {
        const validatedDefinition = WorkflowDefinitionSchema.parse(data.definition);
        sanitizedDefinition = this.sanitizeWorkflowDefinition(validatedDefinition);
      }

      const updateData: UpdateWorkflowData = {
        ...(data.name && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() }),
        ...(sanitizedDefinition && { definition: sanitizedDefinition }),
        ...(data.status && { status: data.status }),
      };

      const workflow = await workflowRepository.update(id, userId, updateData);
      
      if (!workflow) {
        throw new AppError(
          ErrorCode.WORKFLOW_NOT_FOUND,
          'Workflow not found or access denied',
          404
        );
      }

      logger.info(`Workflow updated: ${id} by user: ${userId}`);
      return workflow;
    } catch (error) {
      logger.error('Error updating workflow:', error);
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'ZodError') {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          'Invalid workflow definition',
          400,
          error.message
        );
      }
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to update workflow',
        500
      );
    }
  }

  /**
   * Update workflow status
   */
  async updateWorkflowStatus(id: string, userId: string, status: WorkflowStatus): Promise<Workflow> {
    // Validate status transition
    const currentWorkflow = await this.getWorkflowById(id, userId);
    this.validateStatusTransition(currentWorkflow.status, status);

    const workflow = await workflowRepository.updateStatus(id, userId, status);
    
    if (!workflow) {
      throw new AppError(
        ErrorCode.WORKFLOW_NOT_FOUND,
        'Workflow not found or access denied',
        404
      );
    }

    logger.info(`Workflow status updated: ${id} to ${status} by user: ${userId}`);
    return workflow;
  }

  /**
   * Soft delete workflow (set to INACTIVE)
   */
  async softDeleteWorkflow(id: string, userId: string): Promise<Workflow> {
    const workflow = await workflowRepository.softDelete(id, userId);
    
    if (!workflow) {
      throw new AppError(
        ErrorCode.WORKFLOW_NOT_FOUND,
        'Workflow not found or access denied',
        404
      );
    }

    logger.info(`Workflow soft deleted: ${id} by user: ${userId}`);
    return workflow;
  }

  /**
   * Hard delete workflow
   */
  async deleteWorkflow(id: string, userId: string): Promise<void> {
    try {
      const deleted = await workflowRepository.delete(id, userId);
      
      if (!deleted) {
        throw new AppError(
          ErrorCode.WORKFLOW_NOT_FOUND,
          'Workflow not found or access denied',
          404
        );
      }

      logger.info(`Workflow deleted: ${id} by user: ${userId}`);
    } catch (error) {
      logger.error('Error deleting workflow:', error);
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Error && error.message.includes('active executions')) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          'Cannot delete workflow with active executions',
          400
        );
      }
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to delete workflow',
        500
      );
    }
  }

  /**
   * Duplicate workflow
   */
  async duplicateWorkflow(id: string, userId: string, newName?: string): Promise<Workflow> {
    const originalWorkflow = await this.getWorkflowById(id, userId);
    
    const duplicateData: CreateWorkflowDto = {
      name: newName || `${originalWorkflow.name} (Copy)`,
      description: originalWorkflow.description || undefined,
      definition: originalWorkflow.definition as any,
      status: WorkflowStatus.DRAFT,
    };

    return this.createWorkflow(userId, duplicateData);
  }

  /**
   * Get workflows by status
   */
  async getWorkflowsByStatus(status: WorkflowStatus): Promise<Workflow[]> {
    return workflowRepository.findByStatus(status);
  }

  /**
   * Validate workflow definition
   */
  async validateWorkflowDefinition(definition: any): Promise<boolean> {
    try {
      WorkflowDefinitionSchema.parse(definition);
      
      // Additional business logic validation
      this.validateWorkflowNodes(definition.nodes);
      this.validateWorkflowConnections(definition.nodes, definition.connections);
      
      return true;
    } catch (error) {
      logger.error('Workflow definition validation failed:', error);
      return false;
    }
  }

  /**
   * Private helper methods
   */
  private sanitizeWorkflowDefinition(definition: any): any {
    // Remove any potentially dangerous properties
    const sanitized = { ...definition };
    
    // Sanitize nodes
    if (sanitized.nodes) {
      sanitized.nodes = sanitized.nodes.map((node: any) => ({
        ...node,
        // Remove any script or code properties for security
        parameters: this.sanitizeNodeParameters(node.parameters || {}),
      }));
    }

    return sanitized;
  }

  private sanitizeNodeParameters(parameters: Record<string, any>): Record<string, any> {
    const sanitized = { ...parameters };
    
    // Remove potentially dangerous parameters
    const dangerousKeys = ['script', 'code', 'eval', 'function'];
    dangerousKeys.forEach(key => {
      if (key in sanitized) {
        logger.warn(`Removed dangerous parameter: ${key}`);
        delete sanitized[key];
      }
    });

    return sanitized;
  }

  private validateStatusTransition(currentStatus: WorkflowStatus, newStatus: WorkflowStatus): void {
    const validTransitions: Record<WorkflowStatus, WorkflowStatus[]> = {
      [WorkflowStatus.DRAFT]: [WorkflowStatus.ACTIVE, WorkflowStatus.INACTIVE],
      [WorkflowStatus.ACTIVE]: [WorkflowStatus.INACTIVE, WorkflowStatus.DRAFT],
      [WorkflowStatus.INACTIVE]: [WorkflowStatus.DRAFT, WorkflowStatus.ACTIVE],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        400
      );
    }
  }

  private validateWorkflowNodes(nodes: any[]): void {
    if (!nodes || nodes.length === 0) {
      throw new Error('Workflow must have at least one node');
    }

    // Check for duplicate node IDs
    const nodeIds = nodes.map(node => node.id);
    const duplicateIds = nodeIds.filter((id, index) => nodeIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      throw new Error(`Duplicate node IDs found: ${duplicateIds.join(', ')}`);
    }

    // Validate each node
    nodes.forEach(node => {
      if (!node.id || !node.name || !node.type) {
        throw new Error('Each node must have id, name, and type');
      }
    });
  }

  private validateWorkflowConnections(nodes: any[], connections: any): void {
    const nodeIds = new Set(nodes.map(node => node.id));
    
    // Validate that all connections reference existing nodes
    Object.keys(connections).forEach(sourceNodeId => {
      if (!nodeIds.has(sourceNodeId)) {
        throw new Error(`Connection references non-existent source node: ${sourceNodeId}`);
      }
      
      Object.values(connections[sourceNodeId]).forEach((connectionArray: any) => {
        if (Array.isArray(connectionArray)) {
          connectionArray.forEach((connection: any) => {
            if (!nodeIds.has(connection.node)) {
              throw new Error(`Connection references non-existent target node: ${connection.node}`);
            }
          });
        }
      });
    });
  }

  private mapWorkflowToDto(workflow: Workflow): WorkflowDto {
    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description || undefined,
      definition: workflow.definition as any,
      status: workflow.status,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      userId: workflow.userId,
    };
  }
}

// Export singleton instance
export const workflowService = new WorkflowService();
