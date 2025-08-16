import React, { useState, useEffect } from 'react';
import { Workflow } from '../../../types';
import {
  workflowService,
  CreateWorkflowData,
  UpdateWorkflowData,
} from '../../../services/workflow.service';

interface WorkflowFormProps {
  workflow?: Workflow;
  onSave: (workflow: Workflow) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const WorkflowForm: React.FC<WorkflowFormProps> = ({
  workflow,
  onSave,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'draft' as 'draft' | 'active' | 'inactive',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Initialize form data when workflow prop changes
  useEffect(() => {
    if (workflow) {
      setFormData({
        name: workflow.name,
        description: workflow.description || '',
        status: workflow.status,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        status: 'draft',
      });
    }
    setErrors({});
  }, [workflow]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Workflow name is required';
    } else if (formData.name.length > 255) {
      newErrors.name = 'Workflow name must be less than 255 characters';
    }

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      let savedWorkflow: Workflow;

      if (workflow) {
        // Update existing workflow
        const updateData: UpdateWorkflowData = {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          status: formData.status,
        };
        savedWorkflow = await workflowService.updateWorkflow(
          workflow.id,
          updateData
        );
      } else {
        // Create new workflow
        const createData: CreateWorkflowData = {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          status: formData.status,
          definition: {
            nodes: [
              {
                id: 'start',
                name: 'Start',
                type: 'n8n-nodes-base.start',
                typeVersion: 1,
                position: [240, 300],
                parameters: {},
              },
            ],
            connections: {},
            settings: {
              executionOrder: 'v1' as const,
            },
          },
        };
        savedWorkflow = await workflowService.createWorkflow(createData);
      }

      onSave(savedWorkflow);
    } catch (error) {
      if (error instanceof Error) {
        setErrors({ submit: error.message });
      } else {
        setErrors({ submit: 'An unexpected error occurred' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {workflow ? 'Edit Workflow' : 'Create New Workflow'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Workflow Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Workflow Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter workflow name"
              disabled={saving || isLoading}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter workflow description (optional)"
              disabled={saving || isLoading}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {formData.description.length}/1000 characters
            </p>
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving || isLoading}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              {formData.status === 'draft' &&
                'Workflow is in development and not ready for execution'}
              {formData.status === 'active' &&
                'Workflow is ready and can be executed'}
              {formData.status === 'inactive' &&
                'Workflow is disabled and cannot be executed'}
            </p>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {errors.submit}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving || isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving || isLoading}
            >
              {saving ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {workflow ? 'Updating...' : 'Creating...'}
                </div>
              ) : workflow ? (
                'Update Workflow'
              ) : (
                'Create Workflow'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkflowForm;
