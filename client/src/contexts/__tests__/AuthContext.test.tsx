import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock the auth service
jest.mock('../../services/auth.service', () => ({
  authService: {
    getCurrentUser: jest.fn(),
    refreshToken: jest.fn(),
    clearTokens: jest.fn(),
    getAccessToken: jest.fn(() => null),
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  },
}));

const TestComponent = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'not loading'}</div>
      <div data-testid="authenticated">
        {isAuthenticated ? 'authenticated' : 'not authenticated'}
      </div>
      <div data-testid="user">{user ? user.email : 'no user'}</div>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides initial auth state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initially should be loading
    expect(screen.getByTestId('loading')).toHaveTextContent('loading');

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not loading');
    });

    // Should not be authenticated without token
    expect(screen.getByTestId('authenticated')).toHaveTextContent(
      'not authenticated'
    );
    expect(screen.getByTestId('user')).toHaveTextContent('no user');
  });
});