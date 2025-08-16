/// <reference types="cypress" />

// Custom commands for the workflow automation platform

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login with email and password
       * @example cy.login('user@example.com', 'password123')
       */
      login(email: string, password: string): Chainable<Element>;
      
      /**
       * Custom command to register a new user
       * @example cy.register('John Doe', 'user@example.com', 'password123')
       */
      register(name: string, email: string, password: string): Chainable<Element>;
      
      /**
       * Custom command to create a workflow
       * @example cy.createWorkflow('Test Workflow', 'A test workflow')
       */
      createWorkflow(name: string, description?: string): Chainable<Element>;
      
      /**
       * Custom command to wait for API response
       * @example cy.waitForApi('@getWorkflows')
       */
      waitForApi(alias: string): Chainable<Element>;
      
      /**
       * Custom command to check toast notification
       * @example cy.checkToast('success', 'Workflow created successfully')
       */
      checkToast(type: 'success' | 'error' | 'warning' | 'info', message: string): Chainable<Element>;
    }
  }
}

// Login command
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('[data-testid="email-input"]').type(email);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="login-button"]').click();
  
  // Wait for redirect to dashboard
  cy.url().should('include', '/');
  cy.get('[data-testid="dashboard"]').should('be.visible');
});

// Register command
Cypress.Commands.add('register', (name: string, email: string, password: string) => {
  cy.visit('/register');
  cy.get('[data-testid="name-input"]').type(name);
  cy.get('[data-testid="email-input"]').type(email);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="confirm-password-input"]').type(password);
  cy.get('[data-testid="register-button"]').click();
  
  // Wait for redirect to dashboard
  cy.url().should('include', '/');
  cy.get('[data-testid="dashboard"]').should('be.visible');
});

// Create workflow command
Cypress.Commands.add('createWorkflow', (name: string, description?: string) => {
  cy.visit('/workflows');
  cy.get('[data-testid="create-workflow-button"]').click();
  cy.get('[data-testid="workflow-name-input"]').type(name);
  
  if (description) {
    cy.get('[data-testid="workflow-description-input"]').type(description);
  }
  
  cy.get('[data-testid="save-workflow-button"]').click();
  
  // Wait for workflow to be created
  cy.get('[data-testid="workflow-list"]').should('contain', name);
});

// Wait for API command
Cypress.Commands.add('waitForApi', (alias: string) => {
  cy.wait(alias).then((interception) => {
    expect(interception.response?.statusCode).to.be.oneOf([200, 201]);
  });
});

// Check toast command
Cypress.Commands.add('checkToast', (type: string, message: string) => {
  cy.get(`[data-testid="toast-${type}"]`)
    .should('be.visible')
    .and('contain', message);
});