import { PrismaClient } from '../../generated/prisma';
import { DB_CONFIG } from './index';

export const prisma = new PrismaClient({
  datasources: { db: { url: DB_CONFIG.url } },
});
