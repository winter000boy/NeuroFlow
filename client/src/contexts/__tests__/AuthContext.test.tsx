import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../AuthContext';
import { authService } from '../../services/auth.service';

// Mock the auth service
jest.mock('../../services/auth.service');
const mockAuthService = authService as jest.Mocked<typeof authService>;

// Test component that uses the auth context
const TestComponent: React.FC = () => {
  const { user, isAuthenticated, isLoading, error, login, register, logout, clearError } = useAuth();

  return (
    <div>
      <div data-testid="user">{user ? user.email : 'No user'}</div>
      <div data-testid="isAuthenticated">{isAuthenticated.toString()}</div>
      <div data-testid="isLoading">{isLoading.toString()}</div>
      <div data-testid="error">{error || 'No error'}</div>
      <button onClick={() => login({ email: 'test@example.com', password: 'password' })}>
        Login
      </button>
      <button onClick={() => register({ name: 'Test User', email: 'test@example.com', password: 'password' })}>
        Register
      </button>
      <button onClick={logout}>Logout</button>
      <button onClick={clearError}>Clear Error</button>
    </div>
  );
};

const renderWithAuthProvider = () => {
  return render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Initial state', () => {
    it('should initialize with loading state when no token exists', async () => {
      mockAuthService.getCurrentUser.mockRejectedValue(new Error('No token'));
      
      renderWithAuthProvider();

      expect(screen.getByTestId('user')).toHaveTextContent('No user');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('No error');

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });
    });

    it('should authenticate user when valid token exists', async () => {
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
      localStorage.setItem('accessToken', 'valid-token');
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

      renderWithAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });
    });

    it('should try refresh token when getCurrentUser fails', async () => {
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
      localStorage.setItem('accessToken', 'expired-token');
      
      mockAuthService.getCurrentUser
        .mockRejectedValueOnce(new Error('Token expired'))
        .mockResolvedValueOnce(mockUser);
      mockAuthService.refreshToken.mockResolvedValue(undefined);

      renderWithAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });

      expect(mockAuthService.refreshToken).toHaveBeenCalled();
    });
  });

  describe('Login', () => {
    it('should login successfully', async () => {
      const user = userEvent.setup();
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
      mockAuthService.login.mockResolvedValue({ user: mockUser, tokens: { accessToken: 'token', refreshToken: 'refresh' } });

      renderWithAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      await user.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });
    });

    it('should handle login error', async () => {
      const user = userEvent.setup();
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      renderWithAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      await user.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      });
    });
  });

  describe('Register', () => {
    it('should register successfully', async () => {
      const user = userEvent.setup();
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
      mockAuthService.register.mockResolvedValue({ user: mockUser, tokens: { accessToken: 'token', refreshToken: 'refresh' } });

      renderWithAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      await user.click(screen.getByText('Register'));

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });
    });

    it('should handle registration error', async () => {
      const user = userEvent.setup();
      mockAuthService.register.mockRejectedValue(new Error('Email already exists'));

      renderWithAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      await user.click(screen.getByText('Register'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Email already exists');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      });
    });
  });

  describe('Logout', () => {
    it('should logout successfully', async () => {
      const user = userEvent.setup();
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
      
      // Setup authenticated state
      localStorage.setItem('accessToken', 'valid-token');
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);

      renderWithAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });

      await user.click(screen.getByText('Logout'));

      expect(screen.getByTestId('user')).toHaveTextContent('No user');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      expect(mockAuthService.logout).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should clear error', async () => {
      const user = userEvent.setup();
      mockAuthService.login.mockRejectedValue(new Error('Test error'));

      renderWithAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      // Trigger error
      await user.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Test error');
      });

      // Clear error
      await user.click(screen.getByText('Clear Error'));

      expect(screen.getByTestId('error')).toHaveTextContent('No error');
    });
  });

  describe('Hook usage outside provider', () => {
    it('should throw error when used outside AuthProvider', () => {
      const TestComponentOutsideProvider = () => {
        useAuth();
        return <div>Test</div>;
      };

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<TestComponentOutsideProvider />)).toThrow(
        'useAuth must be used within an AuthProvider'
      );

      consoleSpy.mockRestore();
    });
  });
});