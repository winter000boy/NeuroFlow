import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { userRepository } from '../repositories';
import { RegisterDTO, LoginDTO, RefreshTokenDTO } from '../types/auth.types';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name }: RegisterDTO = req.body;
    const user = await authService.register({ email, password, name });
    
    // Don't return password in response
    const { password: _, ...userWithoutPassword } = user;
    
    res.status(201).json({ 
      success: true, 
      data: { user: userWithoutPassword } 
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password }: LoginDTO = req.body;
    const tokens = await authService.login(email, password);
    
    // Get user info to return with tokens
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }
    
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({ 
      success: true, 
      data: { 
        ...tokens,
        user: userWithoutPassword 
      } 
    });
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken }: RefreshTokenDTO = req.body;
    const tokens = await authService.refresh(refreshToken);
    res.json({ success: true, data: tokens });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken }: RefreshTokenDTO = req.body;
    await authService.logout(refreshToken);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

export const logoutAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }
    
    await authService.logoutAll(userId);
    res.json({ success: true, message: 'Logged out from all devices successfully' });
  } catch (err) {
    next(err);
  }
};
