import React from 'react';

const Workflows: React.FC = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
          Create Workflow
        </button>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Your Workflows</h3>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-500">
            <p>
              No workflows found. Create your first workflow to get started.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workflows;
