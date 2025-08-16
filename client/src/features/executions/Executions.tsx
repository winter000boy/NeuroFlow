import React from 'react';

const Executions: React.FC = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Execution History
      </h1>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Recent Executions
          </h3>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-500">
            <p>No executions found. Execute a workflow to see results here.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Executions;
