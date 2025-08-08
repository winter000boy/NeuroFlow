import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories';
import { AUTH_CONFIG } from '../config';

export const register = async (data: { email: string; password: string }) => {
  const existingUser = await userRepository.findByEmail(data.email);
  if (existingUser) throw new Error('Email already in use');

  const hashedPassword = await bcrypt.hash(data.password, 10);
  return userRepository.create({ email: data.email, password: hashedPassword });
};

export const login = async (email: string, password: string) => {
  const user = await userRepository.findByEmail(email);
  if (!user) throw new Error('Invalid credentials');

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) throw new Error('Invalid credentials');

  return generateTokens(user.id);
};

export const refresh = async (refreshToken: string) => {
  try {
    const payload = jwt.verify(refreshToken, AUTH_CONFIG.jwtSecret) as { userId: number };
    return generateTokens(payload.userId);
  } catch {
    throw new Error('Invalid refresh token');
  }
};

function generateTokens(userId: number) {
  const accessToken = jwt.sign({ userId }, AUTH_CONFIG.jwtSecret, { expiresIn: AUTH_CONFIG.jwtExpiresIn });
  const refreshToken = jwt.sign({ userId }, AUTH_CONFIG.jwtSecret, { expiresIn: AUTH_CONFIG.refreshTokenExpiresIn });
  return { accessToken, refreshToken };
}
