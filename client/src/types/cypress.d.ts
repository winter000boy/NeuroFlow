/// <reference types="cypress" />

// This file extends the global Cypress namespace with custom commands
// It's included in the main tsconfig.json to provide type support throughout the project

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<Element>;
      register(name: string, email: string, password: string): Chainable<Element>;
      createWorkflow(name: string, description?: string): Chainable<Element>;
      waitForApi(alias: string): Chainable<Element>;
      checkToast(type: 'success' | 'error' | 'warning' | 'info', message: string): Chainable<Element>;
    }
  }
}

export {};