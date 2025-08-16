describe('Dashboard', () => {
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
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

  describe('Dashboard Overview', () => {
    it('should display dashboard with empty state', () => {
      cy.visit('/');
      
      cy.get('[data-testid="dashboard"]').should('be.visible');
      cy.get('[data-testid="welcome-message"]').should('contain', testUser.name);
      
      // Should show empty state cards
      cy.get('[data-testid="workflows-count"]').should('contain', '0');
      cy.get('[data-testid="executions-count"]').should('contain', '0');
      cy.get('[data-testid="success-rate"]').should('contain', '0%');
    });

    it('should display dashboard with data', () => {
      // Create some test data first
      cy.createWorkflow('Test Workflow 1');
      cy.createWorkflow('Test Workflow 2');
      
      // Execute workflows
      cy.visit('/workflows');
      cy.get('[data-testid="workflow-item"]').first().click();
      cy.get('[data-testid="execute-workflow-button"]').click();
      
      cy.visit('/');
      
      // Should show updated counts
      cy.get('[data-testid="workflows-count"]').should('contain', '2');
      cy.get('[data-testid="executions-count"]').should('contain', '1');
    });

    it('should display recent executions', () => {
      // Create and execute a workflow
      cy.createWorkflow('Recent Workflow');
      cy.visit('/workflows');
      cy.get('[data-testid="workflow-item"]').first().click();
      cy.get('[data-testid="execute-workflow-button"]').click();
      
      cy.visit('/');
      
      // Should show recent executions section
      cy.get('[data-testid="recent-executions"]').should('be.visible');
      cy.get('[data-testid="recent-execution-item"]').should('have.length.at.least', 1);
      cy.get('[data-testid="recent-execution-item"]').first().should('contain', 'Recent Workflow');
    });

    it('should display workflow statistics', () => {
      cy.createWorkflow('Active Workflow');
      
      cy.visit('/');
      
      // Should show workflow stats
      cy.get('[data-testid="workflow-stats"]').should('be.visible');
      cy.get('[data-testid="active-workflows"]').should('be.visible');
      cy.get('[data-testid="draft-workflows"]').should('be.visible');
    });
  });

  describe('Dashboard Navigation', () => {
    it('should navigate to workflows from dashboard', () => {
      cy.visit('/');
      
      cy.get('[data-testid="view-all-workflows"]').click();
      cy.url().should('include', '/workflows');
    });

    it('should navigate to executions from dashboard', () => {
      cy.visit('/');
      
      cy.get('[data-testid="view-all-executions"]').click();
      cy.url().should('include', '/executions');
    });

    it('should navigate to workflow creation from dashboard', () => {
      cy.visit('/');
      
      cy.get('[data-testid="create-workflow-cta"]').click();
      cy.url().should('include', '/workflows');
      cy.get('[data-testid="workflow-form"]').should('be.visible');
    });
  });

  describe('Dashboard Charts', () => {
    beforeEach(() => {
      // Create test data for charts
      cy.createWorkflow('Chart Test Workflow');
      
      // Execute multiple times
      for (let i = 0; i < 3; i++) {
        cy.visit('/workflows');
        cy.get('[data-testid="workflow-item"]').first().click();
        cy.get('[data-testid="execute-workflow-button"]').click();
        cy.wait(1000);
      }
    });

    it('should display execution trend chart', () => {
      cy.visit('/');
      
      cy.get('[data-testid="execution-trend-chart"]').should('be.visible');
      cy.get('[data-testid="chart-container"]').should('be.visible');
    });

    it('should display success rate chart', () => {
      cy.visit('/');
      
      cy.get('[data-testid="success-rate-chart"]').should('be.visible');
      cy.get('[data-testid="pie-chart"]').should('be.visible');
    });

    it('should update charts when date range changes', () => {
      cy.visit('/');
      
      cy.get('[data-testid="date-range-selector"]').select('7d');
      
      // Charts should update
      cy.get('[data-testid="execution-trend-chart"]').should('be.visible');
      cy.get('[data-testid="success-rate-chart"]').should('be.visible');
    });
  });

  describe('Dashboard Real-time Updates', () => {
    it('should update execution counts in real-time', () => {
      cy.createWorkflow('Real-time Test');
      
      cy.visit('/');
      
      // Initial count
      cy.get('[data-testid="executions-count"]').should('contain', '0');
      
      // Execute workflow in another tab/window (simulate)
      cy.visit('/workflows');
      cy.get('[data-testid="workflow-item"]').first().click();
      cy.get('[data-testid="execute-workflow-button"]').click();
      
      cy.visit('/');
      
      // Count should update
      cy.get('[data-testid="executions-count"]').should('contain', '1');
    });

    it('should show real-time execution status updates', () => {
      cy.createWorkflow('Status Update Test');
      
      cy.visit('/');
      
      // Execute workflow
      cy.visit('/workflows');
      cy.get('[data-testid="workflow-item"]').first().click();
      cy.get('[data-testid="execute-workflow-button"]').click();
      
      cy.visit('/');
      
      // Should show running execution in recent executions
      cy.get('[data-testid="recent-executions"]').should('be.visible');
      cy.get('[data-testid="recent-execution-item"]').first().should('contain', 'RUNNING');
      
      // Wait for status update
      cy.wait(3000);
      
      // Status should update
      cy.get('[data-testid="recent-execution-item"]').first().should('not.contain', 'RUNNING');
    });
  });

  describe('Dashboard Responsive Design', () => {
    it('should display correctly on mobile devices', () => {
      cy.viewport('iphone-x');
      cy.visit('/');
      
      // Should show mobile-optimized layout
      cy.get('[data-testid="dashboard"]').should('be.visible');
      cy.get('[data-testid="mobile-stats-grid"]').should('be.visible');
      
      // Charts should be responsive
      cy.get('[data-testid="execution-trend-chart"]').should('be.visible');
    });

    it('should display correctly on tablet devices', () => {
      cy.viewport('ipad-2');
      cy.visit('/');
      
      // Should show tablet-optimized layout
      cy.get('[data-testid="dashboard"]').should('be.visible');
      cy.get('[data-testid="tablet-layout"]').should('be.visible');
    });
  });

  describe('Dashboard Performance', () => {
    it('should load dashboard quickly', () => {
      const startTime = Date.now();
      
      cy.visit('/');
      
      cy.get('[data-testid="dashboard"]').should('be.visible').then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(3000); // Should load within 3 seconds
      });
    });

    it('should handle large amounts of data efficiently', () => {
      // Create many workflows and executions
      for (let i = 0; i < 10; i++) {
        cy.createWorkflow(`Performance Test Workflow ${i}`);
      }
      
      cy.visit('/');
      
      // Dashboard should still be responsive
      cy.get('[data-testid="dashboard"]').should('be.visible');
      cy.get('[data-testid="workflows-count"]').should('contain', '10');
    });
  });
});