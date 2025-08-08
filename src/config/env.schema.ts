import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.string().default('4000'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  N8N_BASE_URL: z.string().url().optional(),
  N8N_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
