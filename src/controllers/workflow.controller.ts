import { Request, Response, NextFunction } from 'express';
import { workflowService } from '../services/workflow.service';

export const createWorkflow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workflow = await workflowService.create(req.body);
    res.status(201).json({ success: true, data: workflow });
  } catch (err) {
    next(err);
  }
};

export const getAllWorkflows = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workflows = await workflowService.getAll();
    res.json({ success: true, data: workflows });
  } catch (err) {
    next(err);
  }
};
