import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import { UpdateUserProfileDTO, ChangePasswordDTO } from '../types/user.types';

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
    const user = await userService.getById(req.params.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    const user = await userService.getById(userId);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    const updateData: UpdateUserProfileDTO = req.body;
    const updatedUser = await userService.updateProfile(userId, updateData);
    
    res.json({ 
      success: true, 
      data: updatedUser,
      message: 'Profile updated successfully' 
    });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    const passwordData: ChangePasswordDTO = req.body;
    await userService.changePassword(userId, passwordData);
    
    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    await userService.deleteAccount(userId);
    
    res.json({ 
      success: true, 
      message: 'Account deleted successfully' 
    });
  } catch (err) {
    next(err);
  }
};
