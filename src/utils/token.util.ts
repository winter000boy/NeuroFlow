import jwt from 'jsonwebtoken';
import { AUTH_CONFIG } from '../config';

export const generateAccessToken = (userId: number): string => {
  return jwt.sign({ userId }, AUTH_CONFIG.jwtSecret, { expiresIn: AUTH_CONFIG.jwtExpiresIn });
};

export const generateRefreshToken = (userId: number): string => {
  return jwt.sign({ userId }, AUTH_CONFIG.jwtSecret, { expiresIn: AUTH_CONFIG.refreshTokenExpiresIn });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, AUTH_CONFIG.jwtSecret) as { userId: number };
};
