import * as userService from '../user.service';
import { userRepository } from '../../repositories';
import bcrypt from 'bcryptjs';

// Mock dependencies
jest.mock('../../repositories');
jest.mock('bcryptjs');

const mockUserRepository = userRepository as jest.Mocked<typeof userRepository>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all users without passwords', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User 1',
          password: 'hashed-password-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          name: 'User 2',
          password: 'hashed-password-2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockUserRepository.findAll.mockResolvedValue(mockUsers as any);

      const result = await userService.getAll();

      expect(mockUserRepository.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('password');
      expect(result[1]).not.toHaveProperty('password');
      expect(result[0]).toEqual({
        id: 'user-1',
        email: 'user1@example.com',
        name: 'User 1',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('getById', () => {
    const userId = 'user-123';

    it('should return user without password when found', async () => {
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findById.mockResolvedValue(mockUser as any);

      const result = await userService.getById(userId);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(result).not.toHaveProperty('password');
      expect(result).toEqual({
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.getById(userId)).rejects.toThrow('User not found');
    });
  });

  describe('updateProfile', () => {
    const userId = 'user-123';
    const updateData = {
      name: 'Updated Name',
      email: 'updated@example.com',
    };

    it('should update user profile successfully', async () => {
      const existingUser = {
        id: userId,
        email: 'old@example.com',
        name: 'Old Name',
        password: 'hashed-password',
      };

      const updatedUser = {
        ...existingUser,
        ...updateData,
      };

      mockUserRepository.findById.mockResolvedValue(existingUser as any);
      mockUserRepository.findByEmail.mockResolvedValue(null); // Email not taken
      mockUserRepository.update.mockResolvedValue(updatedUser as any);

      const result = await userService.updateProfile(userId, updateData);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(updateData.email);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, updateData);
      expect(result).not.toHaveProperty('password');
      expect(result.name).toBe(updateData.name);
      expect(result.email).toBe(updateData.email);
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.updateProfile(userId, updateData)).rejects.toThrow('User not found');
    });

    it('should throw error when email is already in use', async () => {
      const existingUser = { id: userId, email: 'old@example.com' };
      const emailTakenUser = { id: 'other-user', email: updateData.email };

      mockUserRepository.findById.mockResolvedValue(existingUser as any);
      mockUserRepository.findByEmail.mockResolvedValue(emailTakenUser as any);

      await expect(userService.updateProfile(userId, updateData)).rejects.toThrow('Email already in use');
    });

    it('should allow updating to same email', async () => {
      const existingUser = {
        id: userId,
        email: updateData.email, // Same email
        name: 'Old Name',
      };

      const updatedUser = { ...existingUser, name: updateData.name };

      mockUserRepository.findById.mockResolvedValue(existingUser as any);
      mockUserRepository.findByEmail.mockResolvedValue(existingUser as any); // Same user
      mockUserRepository.update.mockResolvedValue(updatedUser as any);

      const result = await userService.updateProfile(userId, updateData);

      expect(result.name).toBe(updateData.name);
    });
  });

  describe('changePassword', () => {
    const userId = 'user-123';
    const changePasswordData = {
      currentPassword: 'oldpassword',
      newPassword: 'newpassword123',
    };

    it('should change password successfully', async () => {
      const mockUser = {
        id: userId,
        password: 'hashed-old-password',
      };

      mockUserRepository.findById.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockBcrypt.hash.mockResolvedValue('hashed-new-password' as never);
      mockUserRepository.update.mockResolvedValue({} as any);

      await userService.changePassword(userId, changePasswordData);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        changePasswordData.currentPassword,
        mockUser.password
      );
      expect(mockBcrypt.hash).toHaveBeenCalledWith(changePasswordData.newPassword, 10);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
        password: 'hashed-new-password',
      });
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.changePassword(userId, changePasswordData)).rejects.toThrow('User not found');
    });

    it('should throw error when current password is incorrect', async () => {
      const mockUser = { id: userId, password: 'hashed-old-password' };
      mockUserRepository.findById.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(userService.changePassword(userId, changePasswordData)).rejects.toThrow('Current password is incorrect');
      expect(mockBcrypt.hash).not.toHaveBeenCalled();
    });
  });

  describe('deleteAccount', () => {
    const userId = 'user-123';

    it('should delete user account successfully', async () => {
      const mockUser = { id: userId, email: 'test@example.com' };
      mockUserRepository.findById.mockResolvedValue(mockUser as any);
      mockUserRepository.deleteById.mockResolvedValue(undefined);

      await userService.deleteAccount(userId);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.deleteById).toHaveBeenCalledWith(userId);
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.deleteAccount(userId)).rejects.toThrow('User not found');
      expect(mockUserRepository.deleteById).not.toHaveBeenCalled();
    });
  });
});