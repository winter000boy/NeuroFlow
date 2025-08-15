// This file tells TypeScript that our Express Request can hold a "user" object
import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: { userId: number };
    }
  }
}
