import React from 'react';
import ExecutionAnalytics from './ExecutionAnalytics';

interface WorkflowAnalyticsProps {
  workflowId: string;
  workflowName?: string;
}

const WorkflowAnalytics: React.FC<WorkflowAnalyticsProps> = ({ 
  workflowId, 
  workflowName 
}) => {
  return (
    <div className="space-y-4">
      {workflowName && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="text-lg font-medium text-blue-900">
            Analytics for "{workflowName}"
          </h3>
          <p className="text-sm text-blue-700 mt-1">
            Workflow ID: {workflowId}
          </p>
        </div>
      )}
      
      <ExecutionAnalytics workflowId={workflowId} />
    </div>
  );
};

export default WorkflowAnalytics;