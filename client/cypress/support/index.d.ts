/// <reference types="cypress" />

declare namespace Cypress {
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