import { Response } from 'express';

export const success = (res: Response, data: any, status = 200) => {
  res.status(status).json({ success: true, data });
};

export const error = (res: Response, message: string, status = 400) => {
  res.status(status).json({ success: false, error: message });
};
