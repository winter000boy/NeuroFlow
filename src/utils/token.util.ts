import jwt from 'jsonwebtoken';
import { AUTH_CONFIG } from '../config';

export const generateAccessToken = (userId: string): string => {
  return jwt.sign({ userId }, AUTH_CONFIG.jwtSecret, { 
    expiresIn: AUTH_CONFIG.jwtExpiresIn 
  } as jwt.SignOptions);
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId }, AUTH_CONFIG.jwtSecret, { 
    expiresIn: AUTH_CONFIG.refreshTokenExpiresIn 
  } as jwt.SignOptions);
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, AUTH_CONFIG.jwtSecret) as { userId: number };
};
