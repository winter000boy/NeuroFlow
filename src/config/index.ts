import 'dotenv/config';
import path from 'path';
import fs from 'fs';

const requiredVars = ['PORT', 'DATABASE_URL', 'JWT_SECRET'];
requiredVars.forEach((v) => {
  if (!process.env[v]) {
    throw new Error(`Missing required env var: ${v}`);
  }
});

export const APP_CONFIG = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
};

export const DB_CONFIG = {
  url: process.env.DATABASE_URL!,
};

export const AUTH_CONFIG = {
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: '15m',
  refreshTokenExpiresIn: '7d',
};

export const N8N_CONFIG = {
  baseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678',
  apiKey: process.env.N8N_API_KEY || '',
};

export const LOG_CONFIG = {
  level: process.env.LOG_LEVEL || 'info',
};

