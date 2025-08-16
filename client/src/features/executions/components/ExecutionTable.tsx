import React, { useState, useEffect } from 'react';
import { Execution, PaginatedResult } from '../../../types';
import { executionService, ExecutionQueryParams } from '../../../services/execution.service';
import { useExecutionMonitoring } from '../../../hooks/useExecutionMonitoring';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ExecutionStatusIndicator from './ExecutionStatusIndicator';

interface ExecutionTableProps {
  workflowId?: string;
  onExecutionSelect?: (execution: Execution) => void;
}

const ExecutionTable: React.FC<ExecutionTableProps> = ({ 
  workflowId, 
  onExecutionSelect 
}) => {
  const [executions, setExecutions] = useState<PaginatedResult<Execution> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ExecutionQueryParams>({
    page: 1,
    limit: 10,
    workflowId
  });

  // Real-time execution monitoring
  const { getExecutionUpdate, connectionStatus } = useExecutionMonitoring({
    workflowId,
    onExecutionUpdate: (update) => {
      // Update the execution in the list if it exists
      setExecutions(prev => {
        if (!prev) return prev;
        
        const updatedItems = prev.items.map(execution => {
          if (execution.id === update.executionId) {
            return {
              ...execution,
              status: (update.status as any) || execution.status,
              ...(update.status === 'success' || update.status === 'failed' ? {
                finishedAt: new Date()
              } : {})
            };
          }
          return execution;
        });

        return {
          ...prev,
          items: updatedItems
        };
      });
    },
    onExecutionComplete: () => {
      // Refresh the list when an execution completes
      loadExecutions();
    }
  });

  const loadExecutions = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await executionService.getExecutions(filters);
      setExecutions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load executions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExecutions();
  }, [filters]);

  const handleRetry = async (executionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await executionService.retryExecution(executionId);
      loadExecutions(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry execution');
    }
  };

  const handleCancel = async (executionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await executionService.cancelExecution(executionId);
      loadExecutions(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel execution');
    }
  };

  const getExecutionStatus = (execution: Execution) => {
    const realtimeUpdate = getExecutionUpdate(execution.id);
    return realtimeUpdate?.status || execution.status;
  };

  const getExecutionProgress = (execution: Execution) => {
    const realtimeUpdate = getExecutionUpdate(execution.id);
    return realtimeUpdate?.progress;
  };

  const formatDuration = (startedAt: Date, finishedAt?: Date) => {
    const start = new Date(startedAt);
    const end = finishedAt ? new Date(finishedAt) : new Date();
    const duration = end.getTime() - start.getTime();
    
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${Math.round(duration / 1000)}s`;
    return `${Math.round(duration / 60000)}m`;
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (key: keyof ExecutionQueryParams, value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      [key]: value || undefined,
      page: 1 // Reset to first page when filtering
    }));
  };

  if (loading && !executions) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={loadExecutions}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search executions..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Connection Status */}
      {connectionStatus !== 'connected' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
            }`} />
            <span className="text-sm text-yellow-800">
              {connectionStatus === 'connecting' 
                ? 'Connecting to real-time updates...' 
                : 'Real-time updates unavailable'
              }
            </span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Started
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {executions?.items.map((execution) => {
                const currentStatus = getExecutionStatus(execution);
                const progress = getExecutionProgress(execution);
                
                return (
                  <tr
                    key={execution.id}
                    onClick={() => onExecutionSelect?.(execution)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ExecutionStatusIndicator
                        status={currentStatus}
                        progress={progress}
                        showProgress={currentStatus === 'running'}
                        size="sm"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(execution.startedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDuration(execution.startedAt, execution.finishedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {currentStatus === 'failed' && (
                        <button
                          onClick={(e) => handleRetry(execution.id, e)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Retry
                        </button>
                      )}
                      {(currentStatus === 'running' || currentStatus === 'pending') && (
                        <button
                          onClick={(e) => handleCancel(execution.id, e)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {executions && executions.meta.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(executions.meta.page - 1)}
                disabled={executions.meta.page <= 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(executions.meta.page + 1)}
                disabled={executions.meta.page >= executions.meta.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {(executions.meta.page - 1) * executions.meta.limit + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(executions.meta.page * executions.meta.limit, executions.meta.total)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{executions.meta.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(executions.meta.page - 1)}
                    disabled={executions.meta.page <= 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: executions.meta.totalPages }, (_, i) => i + 1)
                    .filter(page => 
                      page === 1 || 
                      page === executions.meta.totalPages || 
                      Math.abs(page - executions.meta.page) <= 2
                    )
                    .map((page, index, array) => (
                      <React.Fragment key={page}>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            ...
                          </span>
                        )}
                        <button
                          onClick={() => handlePageChange(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === executions.meta.page
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                  <button
                    onClick={() => handlePageChange(executions.meta.page + 1)}
                    disabled={executions.meta.page >= executions.meta.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {executions?.items.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <p className="text-lg font-medium">No executions found</p>
              <p className="mt-1">Try adjusting your filters or execute a workflow to see results here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutionTable;