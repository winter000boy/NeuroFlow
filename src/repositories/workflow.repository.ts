import { prisma } from '../config/db.config';
import { Workflow, WorkflowStatus, Prisma } from '../../generated/prisma';
import { CreateWorkflowData, UpdateWorkflowData, WorkflowQueryDto } from '../types/workflow.types';

export class WorkflowRepository {
  /**
   * Create a new workflow
   */
  async create(data: CreateWorkflowData): Promise<Workflow> {
    return prisma.workflow.create({
      data: {
        name: data.name,
        description: data.description,
        definition: data.definition as Prisma.JsonObject,
        status: data.status || WorkflowStatus.DRAFT,
        userId: data.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Find workflow by ID
   */
  async findById(id: string): Promise<Workflow | null> {
    return prisma.workflow.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Find workflow by ID and user ID (for authorization)
   */
  async findByIdAndUserId(id: string, userId: string): Promise<Workflow | null> {
    return prisma.workflow.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Find workflows by user ID with pagination and filtering
   */
  async findByUserId(
    userId: string,
    query: WorkflowQueryDto
  ): Promise<{ workflows: Workflow[]; total: number }> {
    const { page, limit, status, search, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.WorkflowWhereInput = {
      userId,
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Build order by clause
    const orderBy: Prisma.WorkflowOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              executions: true,
            },
          },
        },
      }),
      prisma.workflow.count({ where }),
    ]);

    return { workflows, total };
  }

  /**
   * Update workflow
   */
  async update(id: string, userId: string, data: UpdateWorkflowData): Promise<Workflow | null> {
    // First check if workflow exists and belongs to user
    const existingWorkflow = await this.findByIdAndUserId(id, userId);
    if (!existingWorkflow) {
      return null;
    }

    return prisma.workflow.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.definition && { definition: data.definition as Prisma.JsonObject }),
        ...(data.status && { status: data.status }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Update workflow status
   */
  async updateStatus(id: string, userId: string, status: WorkflowStatus): Promise<Workflow | null> {
    // First check if workflow exists and belongs to user
    const existingWorkflow = await this.findByIdAndUserId(id, userId);
    if (!existingWorkflow) {
      return null;
    }

    return prisma.workflow.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Soft delete workflow (set status to INACTIVE)
   */
  async softDelete(id: string, userId: string): Promise<Workflow | null> {
    return this.updateStatus(id, userId, WorkflowStatus.INACTIVE);
  }

  /**
   * Hard delete workflow
   */
  async delete(id: string, userId: string): Promise<boolean> {
    // First check if workflow exists and belongs to user
    const existingWorkflow = await this.findByIdAndUserId(id, userId);
    if (!existingWorkflow) {
      return false;
    }

    // Check if workflow has active executions
    const activeExecutions = await prisma.execution.count({
      where: {
        workflowId: id,
        status: {
          in: ['PENDING', 'RUNNING'],
        },
      },
    });

    if (activeExecutions > 0) {
      throw new Error('Cannot delete workflow with active executions');
    }

    await prisma.workflow.delete({
      where: { id },
    });

    return true;
  }

  /**
   * Get workflows by status
   */
  async findByStatus(status: WorkflowStatus): Promise<Workflow[]> {
    return prisma.workflow.findMany({
      where: { status },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get workflow with execution statistics
   */
  async findByIdWithStats(id: string, userId: string): Promise<Workflow & { stats: any } | null> {
    const workflow = await this.findByIdAndUserId(id, userId);
    if (!workflow) {
      return null;
    }

    const stats = await prisma.execution.groupBy({
      by: ['status'],
      where: { workflowId: id },
      _count: {
        status: true,
      },
    });

    const totalExecutions = await prisma.execution.count({
      where: { workflowId: id },
    });

    const lastExecution = await prisma.execution.findFirst({
      where: { workflowId: id },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        status: true,
        startedAt: true,
        finishedAt: true,
      },
    });

    return {
      ...workflow,
      stats: {
        totalExecutions,
        statusBreakdown: stats.reduce((acc: Record<string, number>, stat: any) => {
          acc[stat.status] = stat._count.status;
          return acc;
        }, {} as Record<string, number>),
        lastExecution,
      },
    };
  }

  /**
   * Check if user owns workflow
   */
  async isOwner(workflowId: string, userId: string): Promise<boolean> {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        userId,
      },
      select: { id: true },
    });

    return !!workflow;
  }
}

// Export singleton instance
export const workflowRepository = new WorkflowRepository();
