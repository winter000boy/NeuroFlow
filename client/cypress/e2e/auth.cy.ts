describe('Authentication Flow', () => {
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
  };

  beforeEach(() => {
    // Clear any existing auth state
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  describe('User Registration', () => {
    it('should register a new user successfully', () => {
      cy.visit('/register');
      
      // Fill registration form
      cy.get('[data-testid="name-input"]').type(testUser.name);
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="confirm-password-input"]').type(testUser.password);
      
      // Submit form
      cy.get('[data-testid="register-button"]').click();
      
      // Should redirect to dashboard
      cy.url().should('include', '/');
      cy.get('[data-testid="dashboard"]').should('be.visible');
      
      // Should show welcome message
      cy.get('[data-testid="user-welcome"]').should('contain', testUser.name);
    });

    it('should show validation errors for invalid input', () => {
      cy.visit('/register');
      
      // Try to submit empty form
      cy.get('[data-testid="register-button"]').click();
      
      // Should show validation errors
      cy.get('[data-testid="name-error"]').should('be.visible');
      cy.get('[data-testid="email-error"]').should('be.visible');
      cy.get('[data-testid="password-error"]').should('be.visible');
    });

    it('should show error for mismatched passwords', () => {
      cy.visit('/register');
      
      cy.get('[data-testid="name-input"]').type(testUser.name);
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="confirm-password-input"]').type('different-password');
      
      cy.get('[data-testid="register-button"]').click();
      
      cy.get('[data-testid="confirm-password-error"]').should('contain', 'Passwords do not match');
    });
  });

  describe('User Login', () => {
    beforeEach(() => {
      // Assume user is already registered
      cy.request('POST', `${Cypress.env('apiUrl')}/auth/register`, {
        name: testUser.name,
        email: testUser.email,
        password: testUser.password,
      });
    });

    it('should login successfully with valid credentials', () => {
      cy.visit('/login');
      
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="login-button"]').click();
      
      // Should redirect to dashboard
      cy.url().should('include', '/');
      cy.get('[data-testid="dashboard"]').should('be.visible');
    });

    it('should show error for invalid credentials', () => {
      cy.visit('/login');
      
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type('wrong-password');
      cy.get('[data-testid="login-button"]').click();
      
      cy.get('[data-testid="login-error"]').should('be.visible');
    });

    it('should redirect to login when accessing protected routes without auth', () => {
      cy.visit('/workflows');
      cy.url().should('include', '/login');
    });
  });

  describe('User Logout', () => {
    beforeEach(() => {
      // Login first
      cy.request('POST', `${Cypress.env('apiUrl')}/auth/register`, {
        name: testUser.name,
        email: testUser.email,
        password: testUser.password,
      });
      cy.login(testUser.email, testUser.password);
    });

    it('should logout successfully', () => {
      cy.get('[data-testid="logout-button"]').click();
      
      // Should redirect to login
      cy.url().should('include', '/login');
      
      // Should clear auth state
      cy.window().its('localStorage').invoke('getItem', 'accessToken').should('be.null');
    });
  });

  describe('Token Refresh', () => {
    beforeEach(() => {
      cy.request('POST', `${Cypress.env('apiUrl')}/auth/register`, {
        name: testUser.name,
        email: testUser.email,
        password: testUser.password,
      });
      cy.login(testUser.email, testUser.password);
    });

    it('should refresh token automatically when expired', () => {
      // Mock expired token scenario
      cy.window().then((win) => {
        win.localStorage.setItem('accessToken', 'expired-token');
      });
      
      // Make an API request that should trigger token refresh
      cy.visit('/workflows');
      
      // Should still be authenticated after refresh
      cy.get('[data-testid="workflow-list"]').should('be.visible');
    });
  });
});