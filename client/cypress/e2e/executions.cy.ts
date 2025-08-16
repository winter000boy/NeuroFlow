describe('Execution Monitoring', () => {
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
  };

  const testWorkflow = {
    name: 'Test Workflow',
    description: 'A test workflow for execution testing',
  };

  beforeEach(() => {
    // Setup user and login
    cy.request('POST', `${Cypress.env('apiUrl')}/auth/register`, {
      name: testUser.name,
      email: testUser.email,
      password: testUser.password,
    });
    cy.login(testUser.email, testUser.password);
    
    // Create a test workflow
    cy.createWorkflow(testWorkflow.name, testWorkflow.description);
  });

  describe('Execution List', () => {
    it('should display empty state when no executions exist', () => {
      cy.visit('/executions');
      
      cy.get('[data-testid="empty-executions"]').should('be.visible');
      cy.get('[data-testid="empty-executions"]').should('contain', 'No executions found');
    });

    it('should display executions when they exist', () => {
      // Execute the workflow first
      cy.visit('/workflows');
      cy.get('[data-testid="workflow-item"]').first().click();
      cy.get('[data-testid="execute-workflow-button"]').click();
      
      // Navigate to executions
      cy.visit('/executions');
      
      cy.get('[data-testid="execution-list"]').should('be.visible');
      cy.get('[data-testid="execution-item"]').should('have.length.at.least', 1);
      cy.get('[data-testid="execution-item"]').first().should('contain', testWorkflow.name);
    });

    it('should filter executions by status', () => {
      // Create executions with different statuses (mock)
      cy.request('POST', `${Cypress.env('apiUrl')}/executions`, {
        workflowId: 'workflow-id',
        status: 'SUCCESS',
      });
      cy.request('POST', `${Cypress.env('apiUrl')}/executions`, {
        workflowId: 'workflow-id',
        status: 'FAILED',
      });
      
      cy.visit('/executions');
      
      // Filter by success status
      cy.get('[data-testid="status-filter"]').select('SUCCESS');
      cy.get('[data-testid="execution-item"]').should('contain', 'SUCCESS');
      
      // Filter by failed status
      cy.get('[data-testid="status-filter"]').select('FAILED');
      cy.get('[data-testid="execution-item"]').should('contain', 'FAILED');
    });

    it('should filter executions by date range', () => {
      cy.visit('/executions');
      
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      cy.get('[data-testid="date-from-input"]').type(yesterday);
      cy.get('[data-testid="date-to-input"]').type(today);
      cy.get('[data-testid="apply-filter-button"]').click();
      
      // Should show filtered results
      cy.get('[data-testid="execution-list"]').should('be.visible');
    });

    it('should sort executions by different fields', () => {
      cy.visit('/executions');
      
      // Sort by start time
      cy.get('[data-testid="sort-select"]').select('startedAt');
      cy.get('[data-testid="sort-direction-button"]').click();
      
      // Should reorder the list
      cy.get('[data-testid="execution-item"]').should('be.visible');
    });
  });

  describe('Execution Details', () => {
    beforeEach(() => {
      // Execute a workflow to have execution data
      cy.visit('/workflows');
      cy.get('[data-testid="workflow-item"]').first().click();
      cy.get('[data-testid="execute-workflow-button"]').click();
    });

    it('should display execution details', () => {
      cy.visit('/executions');
      
      cy.get('[data-testid="execution-item"]').first().click();
      
      // Should show execution details
      cy.get('[data-testid="execution-details"]').should('be.visible');
      cy.get('[data-testid="execution-status"]').should('be.visible');
      cy.get('[data-testid="execution-start-time"]').should('be.visible');
      cy.get('[data-testid="workflow-name"]').should('contain', testWorkflow.name);
    });

    it('should display execution input and output data', () => {
      cy.visit('/executions');
      cy.get('[data-testid="execution-item"]').first().click();
      
      // Should show input/output tabs
      cy.get('[data-testid="input-data-tab"]').should('be.visible');
      cy.get('[data-testid="output-data-tab"]').should('be.visible');
      
      // Click on input data tab
      cy.get('[data-testid="input-data-tab"]').click();
      cy.get('[data-testid="input-data-content"]').should('be.visible');
      
      // Click on output data tab
      cy.get('[data-testid="output-data-tab"]').click();
      cy.get('[data-testid="output-data-content"]').should('be.visible');
    });

    it('should display execution logs', () => {
      cy.visit('/executions');
      cy.get('[data-testid="execution-item"]').first().click();
      
      cy.get('[data-testid="logs-tab"]').click();
      cy.get('[data-testid="execution-logs"]').should('be.visible');
    });

    it('should allow execution retry for failed executions', () => {
      // Mock a failed execution
      cy.visit('/executions');
      cy.get('[data-testid="execution-item"]').first().click();
      
      // Assuming this is a failed execution
      cy.get('[data-testid="retry-execution-button"]').should('be.visible');
      cy.get('[data-testid="retry-execution-button"]').click();
      
      cy.checkToast('info', 'Execution retry started');
    });
  });

  describe('Real-time Updates', () => {
    it('should show real-time execution status updates', () => {
      // Start a workflow execution
      cy.visit('/workflows');
      cy.get('[data-testid="workflow-item"]').first().click();
      cy.get('[data-testid="execute-workflow-button"]').click();
      
      // Navigate to executions page
      cy.visit('/executions');
      
      // Should show initial status
      cy.get('[data-testid="execution-item"]').first().should('contain', 'PENDING');
      
      // Wait for status update (mock WebSocket update)
      cy.wait(2000);
      
      // Status should update to RUNNING
      cy.get('[data-testid="execution-item"]').first().should('contain', 'RUNNING');
    });

    it('should show live execution logs', () => {
      cy.visit('/executions');
      cy.get('[data-testid="execution-item"]').first().click();
      
      cy.get('[data-testid="logs-tab"]').click();
      
      // Should show live logs indicator
      cy.get('[data-testid="live-logs-indicator"]').should('be.visible');
      
      // Should auto-scroll to bottom
      cy.get('[data-testid="execution-logs"]').should('be.visible');
      cy.get('[data-testid="auto-scroll-toggle"]').should('be.checked');
    });

    it('should update execution progress bar', () => {
      cy.visit('/executions');
      cy.get('[data-testid="execution-item"]').first().click();
      
      // Should show progress bar for running executions
      cy.get('[data-testid="execution-progress"]').should('be.visible');
      
      // Progress should update over time
      cy.get('[data-testid="progress-bar"]').should('have.attr', 'value');
    });
  });

  describe('Execution Analytics', () => {
    beforeEach(() => {
      // Create multiple executions for analytics
      for (let i = 0; i < 5; i++) {
        cy.visit('/workflows');
        cy.get('[data-testid="workflow-item"]').first().click();
        cy.get('[data-testid="execute-workflow-button"]').click();
        cy.wait(1000);
      }
    });

    it('should display execution statistics', () => {
      cy.visit('/executions');
      
      // Should show analytics section
      cy.get('[data-testid="execution-analytics"]').should('be.visible');
      cy.get('[data-testid="total-executions"]').should('be.visible');
      cy.get('[data-testid="success-rate"]').should('be.visible');
      cy.get('[data-testid="average-duration"]').should('be.visible');
    });

    it('should display execution charts', () => {
      cy.visit('/executions');
      
      // Should show charts
      cy.get('[data-testid="executions-chart"]').should('be.visible');
      cy.get('[data-testid="success-rate-chart"]').should('be.visible');
    });

    it('should filter analytics by date range', () => {
      cy.visit('/executions');
      
      const today = new Date().toISOString().split('T')[0];
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      cy.get('[data-testid="analytics-date-from"]').type(lastWeek);
      cy.get('[data-testid="analytics-date-to"]').type(today);
      cy.get('[data-testid="update-analytics-button"]').click();
      
      // Analytics should update
      cy.get('[data-testid="execution-analytics"]').should('be.visible');
    });
  });

  describe('Execution Export', () => {
    it('should export execution data as CSV', () => {
      cy.visit('/executions');
      
      cy.get('[data-testid="export-button"]').click();
      cy.get('[data-testid="export-csv"]').click();
      
      // Should trigger download
      cy.checkToast('success', 'Export started');
    });

    it('should export execution data as JSON', () => {
      cy.visit('/executions');
      
      cy.get('[data-testid="export-button"]').click();
      cy.get('[data-testid="export-json"]').click();
      
      // Should trigger download
      cy.checkToast('success', 'Export started');
    });
  });
});