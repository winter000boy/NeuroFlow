import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories';
import { UpdateUserProfileDTO, ChangePasswordDTO, UserProfileDTO } from '../types/user.types';

export const getAll = async () => {
  const users = await userRepository.findAll();
  // Remove passwords from response
  return users.map(({ password, ...user }: any) => user);
};

export const getById = async (id: string): Promise<UserProfileDTO> => {
  const user = await userRepository.findById(id);
  if (!user) throw new Error('User not found');
  
  // Remove password from response
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

export const updateProfile = async (id: string, data: UpdateUserProfileDTO): Promise<UserProfileDTO> => {
  // Check if user exists
  const existingUser = await userRepository.findById(id);
  if (!existingUser) {
    throw new Error('User not found');
  }

  // If email is being updated, check if it's already in use
  if (data.email && data.email !== existingUser.email) {
    const emailExists = await userRepository.findByEmail(data.email);
    if (emailExists) {
      throw new Error('Email already in use');
    }
  }

  const updatedUser = await userRepository.update(id, data);
  
  // Remove password from response
  const { password, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
};

export const changePassword = async (id: string, data: ChangePasswordDTO): Promise<void> => {
  const user = await userRepository.findById(id);
  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    throw new Error('Current password is incorrect');
  }

  // Hash new password
  const hashedNewPassword = await bcrypt.hash(data.newPassword, 10);
  
  // Update password
  await userRepository.update(id, { password: hashedNewPassword });
};

export const deleteAccount = async (id: string): Promise<void> => {
  const user = await userRepository.findById(id);
  if (!user) {
    throw new Error('User not found');
  }

  // Note: In a real application, you might want to soft delete or archive the user
  // For now, we'll assume the repository handles cascading deletes properly
  await userRepository.deleteById(id);
};
