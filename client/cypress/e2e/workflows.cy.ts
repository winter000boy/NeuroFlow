/// <reference types="cypress" />
/// <reference path="../support/index.d.ts" />

describe('Workflow Management', () => {
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
  };

  const testWorkflow = {
    name: 'Test Workflow',
    description: 'A test workflow for E2E testing',
  };

  beforeEach(() => {
    // Setup user and login
    cy.request('POST', `${Cypress.env('apiUrl')}/auth/register`, {
      name: testUser.name,
      email: testUser.email,
      password: testUser.password,
    });
    cy.login(testUser.email, testUser.password);
  });

  describe('Workflow List', () => {
    it('should display empty state when no workflows exist', () => {
      cy.visit('/workflows');
      
      cy.get('[data-testid="empty-workflows"]').should('be.visible');
      cy.get('[data-testid="create-first-workflow-button"]').should('be.visible');
    });

    it('should display workflows when they exist', () => {
      // Create a workflow first
      cy.createWorkflow(testWorkflow.name, testWorkflow.description);
      
      cy.visit('/workflows');
      
      cy.get('[data-testid="workflow-list"]').should('be.visible');
      cy.get('[data-testid="workflow-item"]').should('have.length.at.least', 1);
      cy.get('[data-testid="workflow-item"]').first().should('contain', testWorkflow.name);
    });

    it('should filter workflows by status', () => {
      cy.createWorkflow('Active Workflow');
      cy.createWorkflow('Draft Workflow');
      
      cy.visit('/workflows');
      
      // Filter by active status
      cy.get('[data-testid="status-filter"]').select('ACTIVE');
      cy.get('[data-testid="workflow-item"]').should('contain', 'Active Workflow');
      
      // Filter by draft status
      cy.get('[data-testid="status-filter"]').select('DRAFT');
      cy.get('[data-testid="workflow-item"]').should('contain', 'Draft Workflow');
    });

    it('should search workflows by name', () => {
      cy.createWorkflow('Searchable Workflow');
      cy.createWorkflow('Another Workflow');
      
      cy.visit('/workflows');
      
      cy.get('[data-testid="search-input"]').type('Searchable');
      cy.get('[data-testid="workflow-item"]').should('have.length', 1);
      cy.get('[data-testid="workflow-item"]').should('contain', 'Searchable Workflow');
    });
  });

  describe('Workflow Creation', () => {
    it('should create a new workflow successfully', () => {
      cy.visit('/workflows');
      
      cy.get('[data-testid="create-workflow-button"]').click();
      
      // Fill workflow form
      cy.get('[data-testid="workflow-name-input"]').type(testWorkflow.name);
      cy.get('[data-testid="workflow-description-input"]').type(testWorkflow.description);
      
      // Add workflow definition (mock)
      cy.get('[data-testid="workflow-definition-input"]').type(JSON.stringify({
        nodes: [
          { id: '1', type: 'trigger', name: 'Start' },
          { id: '2', type: 'action', name: 'Send Email' }
        ],
        connections: [{ from: '1', to: '2' }]
      }));
      
      cy.get('[data-testid="save-workflow-button"]').click();
      
      // Should show success message
      cy.checkToast('success', 'Workflow created successfully');
      
      // Should redirect to workflow list
      cy.url().should('include', '/workflows');
      cy.get('[data-testid="workflow-list"]').should('contain', testWorkflow.name);
    });

    it('should show validation errors for invalid workflow data', () => {
      cy.visit('/workflows');
      cy.get('[data-testid="create-workflow-button"]').click();
      
      // Try to save without required fields
      cy.get('[data-testid="save-workflow-button"]').click();
      
      cy.get('[data-testid="name-error"]').should('be.visible');
      cy.get('[data-testid="definition-error"]').should('be.visible');
    });

    it('should cancel workflow creation', () => {
      cy.visit('/workflows');
      cy.get('[data-testid="create-workflow-button"]').click();
      
      cy.get('[data-testid="workflow-name-input"]').type('Test Workflow');
      cy.get('[data-testid="cancel-button"]').click();
      
      // Should return to workflow list without saving
      cy.url().should('include', '/workflows');
      cy.get('[data-testid="workflow-list"]').should('not.contain', 'Test Workflow');
    });
  });

  describe('Workflow Editing', () => {
    beforeEach(() => {
      cy.createWorkflow(testWorkflow.name, testWorkflow.description);
    });

    it('should edit workflow successfully', () => {
      cy.visit('/workflows');
      
      cy.get('[data-testid="workflow-item"]').first().click();
      cy.get('[data-testid="edit-workflow-button"]').click();
      
      const updatedName = 'Updated Workflow Name';
      cy.get('[data-testid="workflow-name-input"]').clear().type(updatedName);
      cy.get('[data-testid="save-workflow-button"]').click();
      
      cy.checkToast('success', 'Workflow updated successfully');
      cy.get('[data-testid="workflow-list"]').should('contain', updatedName);
    });

    it('should change workflow status', () => {
      cy.visit('/workflows');
      
      cy.get('[data-testid="workflow-item"]').first().click();
      cy.get('[data-testid="status-toggle"]').click();
      
      cy.checkToast('success', 'Workflow status updated');
      cy.get('[data-testid="workflow-status"]').should('contain', 'ACTIVE');
    });
  });

  describe('Workflow Deletion', () => {
    beforeEach(() => {
      cy.createWorkflow(testWorkflow.name, testWorkflow.description);
    });

    it('should delete workflow with confirmation', () => {
      cy.visit('/workflows');
      
      cy.get('[data-testid="workflow-item"]').first().click();
      cy.get('[data-testid="delete-workflow-button"]').click();
      
      // Confirm deletion
      cy.get('[data-testid="confirm-delete-button"]').click();
      
      cy.checkToast('success', 'Workflow deleted successfully');
      cy.get('[data-testid="workflow-list"]').should('not.contain', testWorkflow.name);
    });

    it('should cancel workflow deletion', () => {
      cy.visit('/workflows');
      
      cy.get('[data-testid="workflow-item"]').first().click();
      cy.get('[data-testid="delete-workflow-button"]').click();
      
      // Cancel deletion
      cy.get('[data-testid="cancel-delete-button"]').click();
      
      // Workflow should still exist
      cy.get('[data-testid="workflow-list"]').should('contain', testWorkflow.name);
    });
  });

  describe('Workflow Execution', () => {
    beforeEach(() => {
      cy.createWorkflow(testWorkflow.name, testWorkflow.description);
    });

    it('should execute workflow successfully', () => {
      cy.visit('/workflows');
      
      cy.get('[data-testid="workflow-item"]').first().click();
      cy.get('[data-testid="execute-workflow-button"]').click();
      
      // Should show execution started message
      cy.checkToast('info', 'Workflow execution started');
      
      // Should redirect to executions page
      cy.url().should('include', '/executions');
      
      // Should show the new execution
      cy.get('[data-testid="execution-list"]').should('contain', testWorkflow.name);
    });

    it('should execute workflow with input data', () => {
      cy.visit('/workflows');
      
      cy.get('[data-testid="workflow-item"]').first().click();
      cy.get('[data-testid="execute-with-data-button"]').click();
      
      // Provide input data
      cy.get('[data-testid="input-data-textarea"]').type(JSON.stringify({
        email: 'test@example.com',
        message: 'Hello World'
      }));
      
      cy.get('[data-testid="execute-button"]').click();
      
      cy.checkToast('info', 'Workflow execution started');
    });
  });
});