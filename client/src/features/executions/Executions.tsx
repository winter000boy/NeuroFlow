import React, { useState } from 'react';
import { Execution } from '../../types';
import { ExecutionTable, ExecutionDetail, ExecutionAnalytics } from './components';

const Executions: React.FC = () => {
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'analytics'>('history');

  const handleExecutionSelect = (execution: Execution) => {
    setSelectedExecution(execution);
  };

  const handleCloseDetail = () => {
    setSelectedExecution(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Execution Monitoring
        </h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Execution History
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Analytics & Reports
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'history' && (
        <ExecutionTable onExecutionSelect={handleExecutionSelect} />
      )}

      {activeTab === 'analytics' && (
        <ExecutionAnalytics />
      )}

      {selectedExecution && (
        <ExecutionDetail
          executionId={selectedExecution.id}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
};

export default Executions;
