import React, { useState, useEffect } from 'react';
import { Workflow } from '../../../types';
import { workflowService } from '../../../services/workflow.service';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

interface WorkflowDetailProps {
  workflowId: string;
  onEdit: (workflow: Workflow) => void;
  onBack: () => void;
}

const WorkflowDetail: React.FC<WorkflowDetailProps> = ({
  workflowId,
  onEdit,
  onBack,
}) => {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWorkflow();
  }, [workflowId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadWorkflow = async () => {
    try {
      setLoading(true);
      setError(null);
      const workflowData = await workflowService.getWorkflowById(workflowId);
      setWorkflow(workflowData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflow');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (
    newStatus: 'draft' | 'active' | 'inactive'
  ) => {
    if (!workflow) return;

    try {
      const updatedWorkflow = await workflowService.updateWorkflowStatus(
        workflow.id,
        newStatus
      );
      setWorkflow(updatedWorkflow);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update workflow status'
      );
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
        <div className="mt-4">
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Workflows
          </button>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-500">Workflow not found</p>
          <button
            onClick={onBack}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            ← Back to Workflows
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Workflows
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{workflow.name}</h1>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={workflow.status}
            onChange={(e) => handleStatusChange(e.target.value as any)}
            className={`text-sm px-3 py-1 rounded-full font-medium border-0 ${getStatusBadgeClass(workflow.status)}`}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            onClick={() => onEdit(workflow)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Edit Workflow
          </button>
        </div>
      </div>

      {/* Workflow Information */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Workflow Information
          </h3>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{workflow.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(workflow.status)}`}
                >
                  {workflow.status.charAt(0).toUpperCase() +
                    workflow.status.slice(1)}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(workflow.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Last Updated
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(workflow.updatedAt)}
              </dd>
            </div>
            {workflow.description && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">
                  Description
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {workflow.description}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Workflow Definition */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Workflow Definition
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Nodes ({workflow.definition.nodes.length})
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {workflow.definition.nodes.map((node: any, index: number) => (
                  <div
                    key={node.id || index}
                    className="border border-gray-200 rounded-md p-3"
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {node.name || node.id}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {node.type}
                    </div>
                    {node.position && (
                      <div className="text-xs text-gray-400 mt-1">
                        Position: ({node.position[0]}, {node.position[1]})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Connections
              </h4>
              <div className="text-sm text-gray-600">
                {Object.keys(workflow.definition.connections).length === 0 ? (
                  <p className="text-gray-500 italic">No connections defined</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(workflow.definition.connections).map(
                      ([sourceNode, connections]) => (
                        <div
                          key={sourceNode}
                          className="border border-gray-200 rounded-md p-3"
                        >
                          <div className="font-medium">From: {sourceNode}</div>
                          <div className="mt-1 space-y-1">
                            {Object.entries(connections as any).map(
                              ([outputType, targets]) => (
                                <div key={outputType} className="text-sm">
                                  <span className="text-gray-600">
                                    {outputType}:
                                  </span>
                                  {Array.isArray(targets) &&
                                    targets.map((target: any, idx: number) => (
                                      <span
                                        key={idx}
                                        className="ml-2 text-blue-600"
                                      >
                                        {target.node}
                                        {target.type && ` (${target.type})`}
                                      </span>
                                    ))}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

            {workflow.definition.settings &&
              Object.keys(workflow.definition.settings).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Settings
                  </h4>
                  <div className="bg-gray-50 rounded-md p-3">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                      {JSON.stringify(workflow.definition.settings, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Actions</h3>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onEdit(workflow)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Edit Workflow
            </button>
            <button
              onClick={() => {
                // TODO: Implement workflow execution
                alert(
                  'Workflow execution will be implemented in the next task'
                );
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              disabled={workflow.status !== 'active'}
            >
              Execute Workflow
            </button>
            <button
              onClick={async () => {
                try {
                  await workflowService.duplicateWorkflow(workflow.id);
                  alert('Workflow duplicated successfully');
                } catch (err) {
                  alert('Failed to duplicate workflow');
                }
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Duplicate
            </button>
          </div>
          {workflow.status !== 'active' && (
            <p className="mt-2 text-sm text-gray-500">
              Workflow must be in "Active" status to execute
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowDetail;
