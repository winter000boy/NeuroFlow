import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await userService.getAll();
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.getById(parseInt(req.params.id, 10));
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};
