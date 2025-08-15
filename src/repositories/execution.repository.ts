import { prisma } from '../config/db.config';
import { Execution, ExecutionStatus, Prisma } from '../../generated/prisma';
import {
  CreateExecutionDTO,
  UpdateExecutionDTO,
  ExecutionFilterDTO,
  ExecutionSortDTO,
  PaginationDTO,
  PaginatedResult,
  ExecutionAnalytics,
} from '../types/execution.types';

export class ExecutionRepository {
  /**
   * Create a new execution record
   */
  async create(data: CreateExecutionDTO): Promise<Execution> {
    return prisma.execution.create({
      data: {
        workflowId: data.workflowId,
        userId: data.userId,
        status: data.status || ExecutionStatus.PENDING,
        inputData: data.inputData,
        n8nExecutionId: data.n8nExecutionId,
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Find execution by ID
   */
  async findById(id: string): Promise<Execution | null> {
    return prisma.execution.findUnique({
      where: { id },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Update execution with partial data
   */
  async update(id: string, data: UpdateExecutionDTO): Promise<Execution> {
    return prisma.execution.update({
      where: { id },
      data: {
        ...data,
        // Set finishedAt automatically when status changes to SUCCESS, FAILED, or CANCELLED
        finishedAt: data.status && ['SUCCESS', 'FAILED', 'CANCELLED'].includes(data.status) 
          ? data.finishedAt || new Date() 
          : data.finishedAt,
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Update execution status
   */
  async updateStatus(id: string, status: ExecutionStatus, errorMessage?: string): Promise<Execution> {
    const updateData: UpdateExecutionDTO = {
      status,
      errorMessage,
    };

    // Set finishedAt for terminal states
    if (['SUCCESS', 'FAILED', 'CANCELLED'].includes(status)) {
      updateData.finishedAt = new Date();
    }

    return this.update(id, updateData);
  }

  /**
   * Delete execution by ID
   */
  async delete(id: string): Promise<void> {
    await prisma.execution.delete({
      where: { id },
    });
  }

  /**
   * Find executions with filtering, sorting, and pagination
   */
  async findMany(
    filters: ExecutionFilterDTO = {},
    sort: ExecutionSortDTO = { field: 'startedAt', direction: 'desc' },
    pagination: PaginationDTO = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<Execution>> {
    const where: Prisma.ExecutionWhereInput = {};

    // Apply filters
    if (filters.workflowId) {
      where.workflowId = filters.workflowId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startedAfter || filters.startedBefore) {
      where.startedAt = {};
      if (filters.startedAfter) {
        where.startedAt.gte = filters.startedAfter;
      }
      if (filters.startedBefore) {
        where.startedAt.lte = filters.startedBefore;
      }
    }

    if (filters.finishedAfter || filters.finishedBefore) {
      where.finishedAt = {};
      if (filters.finishedAfter) {
        where.finishedAt.gte = filters.finishedAfter;
      }
      if (filters.finishedBefore) {
        where.finishedAt.lte = filters.finishedBefore;
      }
    }

    // Calculate pagination
    const skip = (pagination.page - 1) * pagination.limit;
    const take = pagination.limit;

    // Execute queries
    const [items, total] = await Promise.all([
      prisma.execution.findMany({
        where,
        orderBy: {
          [sort.field]: sort.direction,
        },
        skip,
        take,
        include: {
          workflow: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      prisma.execution.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Find executions by workflow ID with pagination
   */
  async findByWorkflowId(
    workflowId: string,
    pagination: PaginationDTO = { page: 1, limit: 20 },
    sort: ExecutionSortDTO = { field: 'startedAt', direction: 'desc' }
  ): Promise<PaginatedResult<Execution>> {
    return this.findMany({ workflowId }, sort, pagination);
  }

  /**
   * Find executions by user ID with pagination
   */
  async findByUserId(
    userId: string,
    pagination: PaginationDTO = { page: 1, limit: 20 },
    sort: ExecutionSortDTO = { field: 'startedAt', direction: 'desc' }
  ): Promise<PaginatedResult<Execution>> {
    return this.findMany({ userId }, sort, pagination);
  }

  /**
   * Get execution analytics for a workflow or user
   */
  async getAnalytics(filters: Pick<ExecutionFilterDTO, 'workflowId' | 'userId'> = {}): Promise<ExecutionAnalytics> {
    const where: Prisma.ExecutionWhereInput = {};

    if (filters.workflowId) {
      where.workflowId = filters.workflowId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    // Get basic counts
    const [
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      executionsByStatus,
      executionsWithDuration,
    ] = await Promise.all([
      prisma.execution.count({ where }),
      prisma.execution.count({ where: { ...where, status: ExecutionStatus.SUCCESS } }),
      prisma.execution.count({ where: { ...where, status: ExecutionStatus.FAILED } }),
      prisma.execution.groupBy({
        by: ['status'],
        where,
        _count: {
          status: true,
        },
      }),
      prisma.execution.findMany({
        where: {
          ...where,
          finishedAt: { not: null },
        },
        select: {
          startedAt: true,
          finishedAt: true,
        },
      }),
    ]);

    // Calculate average execution time
    const totalDuration = executionsWithDuration.reduce((sum: number, execution: { startedAt: Date; finishedAt: Date | null }) => {
      if (execution.finishedAt) {
        return sum + (execution.finishedAt.getTime() - execution.startedAt.getTime());
      }
      return sum;
    }, 0);

    const averageExecutionTime = executionsWithDuration.length > 0 
      ? totalDuration / executionsWithDuration.length 
      : 0;

    // Format executions by status
    const statusCounts = Object.values(ExecutionStatus).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<ExecutionStatus, number>);

    executionsByStatus.forEach((group: { status: ExecutionStatus; _count: { status: number } }) => {
      statusCounts[group.status] = group._count.status;
    });

    // Get executions by day for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const executionsByDay = await prisma.$queryRaw<Array<{
      date: string;
      count: bigint;
      success_count: bigint;
      failure_count: bigint;
    }>>`
      SELECT 
        DATE(started_at) as date,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as success_count,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failure_count
      FROM executions 
      WHERE started_at >= ${thirtyDaysAgo}
        ${filters.workflowId ? Prisma.sql`AND workflow_id = ${filters.workflowId}` : Prisma.empty}
        ${filters.userId ? Prisma.sql`AND user_id = ${filters.userId}` : Prisma.empty}
      GROUP BY DATE(started_at)
      ORDER BY date DESC
    `;

    const formattedExecutionsByDay = executionsByDay.map((day: {
      date: string;
      count: bigint;
      success_count: bigint;
      failure_count: bigint;
    }) => ({
      date: day.date,
      count: Number(day.count),
      successCount: Number(day.success_count),
      failureCount: Number(day.failure_count),
    }));

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
      averageExecutionTime,
      executionsByStatus: statusCounts,
      executionsByDay: formattedExecutionsByDay,
    };
  }

  /**
   * Get recent executions for a user
   */
  async getRecentExecutions(
    userId: string,
    limit: number = 10
  ): Promise<Execution[]> {
    return prisma.execution.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Get running executions
   */
  async getRunningExecutions(userId?: string): Promise<Execution[]> {
    const where: Prisma.ExecutionWhereInput = {
      status: ExecutionStatus.RUNNING,
    };

    if (userId) {
      where.userId = userId;
    }

    return prisma.execution.findMany({
      where,
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Cancel execution by ID
   */
  async cancel(id: string): Promise<Execution> {
    return this.updateStatus(id, ExecutionStatus.CANCELLED);
  }

  /**
   * Bulk update execution statuses
   */
  async bulkUpdateStatus(
    ids: string[],
    status: ExecutionStatus,
    errorMessage?: string
  ): Promise<number> {
    const updateData: Prisma.ExecutionUpdateManyArgs['data'] = {
      status,
      errorMessage,
    };

    // Set finishedAt for terminal states
    if (['SUCCESS', 'FAILED', 'CANCELLED'].includes(status)) {
      updateData.finishedAt = new Date();
    }

    const result = await prisma.execution.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: updateData,
    });

    return result.count;
  }
}

// Export singleton instance
export const executionRepository = new ExecutionRepository();
