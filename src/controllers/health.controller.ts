import { Request, Response } from 'express';

export const healthCheck = (req: Request, res: Response) => {
  res.json({ ok: true, uptime: process.uptime(), timestamp: Date.now() });
};
