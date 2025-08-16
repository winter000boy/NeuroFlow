import React, { useState } from 'react';
import { Workflow } from '../../types';
import { WorkflowList, WorkflowForm, WorkflowDetail } from './components';
import Modal from '../../components/common/Modal';

type ViewMode = 'list' | 'detail' | 'create' | 'edit';

const Workflows: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
    null
  );
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);

  const handleWorkflowSelect = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setViewMode('detail');
  };

  const handleWorkflowEdit = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setShowFormModal(true);
  };

  const handleCreateNew = () => {
    setEditingWorkflow(null);
    setShowFormModal(true);
  };

  const handleFormSave = (workflow: Workflow) => {
    setShowFormModal(false);
    setEditingWorkflow(null);
    // If we're in detail view and editing the same workflow, update it
    if (selectedWorkflow && selectedWorkflow.id === workflow.id) {
      setSelectedWorkflow(workflow);
    }
    // If we created a new workflow, show its detail
    if (!editingWorkflow) {
      setSelectedWorkflow(workflow);
      setViewMode('detail');
    }
  };

  const handleFormCancel = () => {
    setShowFormModal(false);
    setEditingWorkflow(null);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedWorkflow(null);
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'detail':
        return selectedWorkflow ? (
          <WorkflowDetail
            workflowId={selectedWorkflow.id}
            onEdit={handleWorkflowEdit}
            onBack={handleBackToList}
          />
        ) : null;

      case 'list':
      default:
        return (
          <WorkflowList
            onWorkflowSelect={handleWorkflowSelect}
            onWorkflowEdit={handleWorkflowEdit}
            onCreateNew={handleCreateNew}
          />
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {renderContent()}

      {/* Workflow Form Modal */}
      <Modal isOpen={showFormModal} onClose={handleFormCancel} size="lg">
        <WorkflowForm
          workflow={editingWorkflow || undefined}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      </Modal>
    </div>
  );
};

export default Workflows;
