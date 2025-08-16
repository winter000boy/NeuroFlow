import * as authService from '../auth.service';
import { userRepository, refreshTokenRepository } from '../../repositories';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../repositories');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => 'mock-refresh-token')
  }))
}));

const mockUserRepository = userRepository as jest.Mocked<typeof userRepository>;
const mockRefreshTokenRepository = refreshTokenRepository as jest.Mocked<typeof refreshTokenRepository>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: userData.email,
        name: userData.name,
        password: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('hashed-password' as never);
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await authService.register(userData);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: userData.email,
        password: 'hashed-password',
        name: userData.name,
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw error when email already exists', async () => {
      const existingUser = { id: 'existing-user', email: userData.email };
      mockUserRepository.findByEmail.mockResolvedValue(existingUser as any);

      await expect(authService.register(userData)).rejects.toThrow('Email already in use');
      expect(mockBcrypt.hash).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const email = 'test@example.com';
    const password = 'password123';

    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email,
        password: 'hashed-password',
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockJwt.sign.mockReturnValue('mock-access-token' as never);
      mockRefreshTokenRepository.create.mockResolvedValue({} as any);

      const result = await authService.login(email, password);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, mockUser.password);
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login(email, password)).rejects.toThrow('Invalid credentials');
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw error when password is invalid', async () => {
      const mockUser = { id: 'user-123', email, password: 'hashed-password' };
      mockUserRepository.findByEmail.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(authService.login(email, password)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refresh', () => {
    const refreshToken = 'valid-refresh-token';

    it('should refresh tokens successfully', async () => {
      const mockStoredToken = {
        id: 'token-123',
        token: refreshToken,
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 60000), // Future date
      };

      mockRefreshTokenRepository.findByToken.mockResolvedValue(mockStoredToken as any);
      mockJwt.sign.mockReturnValue('new-access-token' as never);
      mockRefreshTokenRepository.deleteByToken.mockResolvedValue();
      mockRefreshTokenRepository.create.mockResolvedValue({} as any);

      const result = await authService.refresh(refreshToken);

      expect(mockRefreshTokenRepository.findByToken).toHaveBeenCalledWith(refreshToken);
      expect(mockRefreshTokenRepository.deleteByToken).toHaveBeenCalledWith(refreshToken);
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'mock-refresh-token',
      });
    });

    it('should throw error when refresh token not found', async () => {
      mockRefreshTokenRepository.findByToken.mockResolvedValue(null);

      await expect(authService.refresh(refreshToken)).rejects.toThrow('Invalid refresh token');
    });

    it('should throw error when refresh token is expired', async () => {
      const expiredToken = {
        id: 'token-123',
        token: refreshToken,
        userId: 'user-123',
        expiresAt: new Date(Date.now() - 60000), // Past date
      };

      mockRefreshTokenRepository.findByToken.mockResolvedValue(expiredToken as any);
      mockRefreshTokenRepository.deleteByToken.mockResolvedValue();

      await expect(authService.refresh(refreshToken)).rejects.toThrow('Refresh token expired');
      expect(mockRefreshTokenRepository.deleteByToken).toHaveBeenCalledWith(refreshToken);
    });
  });

  describe('logout', () => {
    const refreshToken = 'refresh-token';

    it('should logout successfully', async () => {
      mockRefreshTokenRepository.deleteByToken.mockResolvedValue();

      await authService.logout(refreshToken);

      expect(mockRefreshTokenRepository.deleteByToken).toHaveBeenCalledWith(refreshToken);
    });

    it('should handle logout when token does not exist', async () => {
      mockRefreshTokenRepository.deleteByToken.mockRejectedValue(new Error('Token not found'));

      // Should not throw error
      await expect(authService.logout(refreshToken)).resolves.not.toThrow();
    });
  });

  describe('logoutAll', () => {
    const userId = 'user-123';

    it('should logout from all devices successfully', async () => {
      mockRefreshTokenRepository.deleteByUserId.mockResolvedValue();

      await authService.logoutAll(userId);

      expect(mockRefreshTokenRepository.deleteByUserId).toHaveBeenCalledWith(userId);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should cleanup expired tokens successfully', async () => {
      mockRefreshTokenRepository.deleteExpired.mockResolvedValue();

      await authService.cleanupExpiredTokens();

      expect(mockRefreshTokenRepository.deleteExpired).toHaveBeenCalled();
    });
  });
});