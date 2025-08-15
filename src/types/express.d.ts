// This file tells TypeScript that our Express Request can hold additional properties
import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string };
      workflowId?: string;
      userId?: string;
    }
  }
}
