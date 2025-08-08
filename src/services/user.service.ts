import { userRepository } from '../repositories';

export const getAll = async () => {
  return userRepository.findAll();
};

export const getById = async (id: number) => {
  const user = await userRepository.findById(id);
  if (!user) throw new Error('User not found');
  return user;
};
