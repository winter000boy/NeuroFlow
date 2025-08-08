import { Request, Response, NextFunction } from 'express';
import { executionService } from '../services/execution.service';

export const triggerExecution = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const execution = await executionService.trigger(req.body.workflowId, req.body.payload);
    res.status(202).json({ success: true, data: execution });
  } catch (err) {
    next(err);
  }
};

export const getExecutionStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await executionService.getStatus(req.params.id);
    res.json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
};
