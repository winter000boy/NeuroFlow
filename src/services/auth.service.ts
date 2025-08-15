import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { userRepository, refreshTokenRepository } from '../repositories';
import { AUTH_CONFIG } from '../config';
import { TokenPair } from '../types/auth.types';

export const register = async (data: { email: string; password: string; name?: string }) => {
  const existingUser = await userRepository.findByEmail(data.email);
  if (existingUser) throw new Error('Email already in use');

  const hashedPassword = await bcrypt.hash(data.password, 10);
  return userRepository.create({ 
    email: data.email, 
    password: hashedPassword,
    name: data.name || null 
  });
};

export const login = async (email: string, password: string): Promise<TokenPair> => {
  const user = await userRepository.findByEmail(email);
  if (!user) throw new Error('Invalid credentials');

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) throw new Error('Invalid credentials');

  return generateTokens(user.id);
};

export const refresh = async (refreshToken: string): Promise<TokenPair> => {
  // Find the refresh token in the database
  const storedToken = await refreshTokenRepository.findByToken(refreshToken);
  if (!storedToken) {
    throw new Error('Invalid refresh token');
  }

  // Check if token is expired
  if (storedToken.expiresAt < new Date()) {
    // Clean up expired token
    await refreshTokenRepository.deleteByToken(refreshToken);
    throw new Error('Refresh token expired');
  }

  // Generate new token pair
  const tokens = await generateTokens(storedToken.userId);
  
  // Remove old refresh token
  await refreshTokenRepository.deleteByToken(refreshToken);
  
  return tokens;
};

export const logout = async (refreshToken: string): Promise<void> => {
  try {
    await refreshTokenRepository.deleteByToken(refreshToken);
  } catch (error) {
    // Token might not exist, which is fine for logout
  }
};

export const logoutAll = async (userId: string): Promise<void> => {
  await refreshTokenRepository.deleteByUserId(userId);
};

export const cleanupExpiredTokens = async (): Promise<void> => {
  await refreshTokenRepository.deleteExpired();
};

async function generateTokens(userId: string): Promise<TokenPair> {
  const accessToken = jwt.sign({ userId }, AUTH_CONFIG.jwtSecret, { 
    expiresIn: AUTH_CONFIG.jwtExpiresIn 
  } as jwt.SignOptions);
  
  // Generate secure random refresh token
  const refreshToken = crypto.randomBytes(64).toString('hex');
  
  // Calculate expiration date (7 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  // Store refresh token in database
  await refreshTokenRepository.create({
    token: refreshToken,
    userId,
    expiresAt
  });
  
  return { accessToken, refreshToken };
}
