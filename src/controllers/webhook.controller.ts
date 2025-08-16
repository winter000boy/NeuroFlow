import { Request, Response } from 'express';
import { executionService } from '../services';
import { N8N_CONFIG } from '../config';
import { 
  extractWebhookPayload, 
  validateWebhookPayload, 
  verifyWebhookSignature,
  getExecutionStatusFromPayload,
  getErrorMessageFromPayload,
  getOutputDataFromPayload
} from '../utils/webhook.util';
import { asyncHandler } from '../utils/asyncHandler.util';
import { success, error as errorResponse } from '../utils/response.util';
import { logger } from '../config/logger.config';
import { AppError, ErrorCode } from '../utils/errors';

export class WebhookController {
  /**
   * Handle n8n execution webhook callback
   */
  handleN8nWebhook = asyncHandler(async (req: Request, res: Response) => {
    try {
      // Extract webhook signature for verification
      const signature = req.headers['x-n8n-signature'] as string;
      const webhookSecret = N8N_CONFIG.webhookSecret;

      // Verify webhook signature if secret is configured
      if (webhookSecret && signature) {
        const rawBody = JSON.stringify(req.body);
        const isValidSignature = verifyWebhookSignature(rawBody, signature, webhookSecret);
        
        if (!isValidSignature) {
          logger.warn('Invalid webhook signature received', {
            signature,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
          });
          
          return errorResponse(res, 'Invalid webhook signature', 401);
        }
      }

      // Extract and validate payload
      const payload = extractWebhookPayload(req);
      if (!payload || !validateWebhookPayload(payload)) {
        logger.warn('Invalid webhook payload received', {
          body: req.body,
          ip: req.ip,
        });
        
        return errorResponse(res, 'Invalid webhook payload', 400);
      }

      logger.info('Processing n8n webhook', {
        executionId: payload.executionId,
        workflowId: payload.workflowId,
        finished: payload.finished,
        mode: payload.mode,
      });

      // Process the webhook payload
      await this.processWebhookPayload(payload);

      // Return success response
      return success(res, { message: 'Webhook processed successfully' });

    } catch (error) {
      logger.error('Error processing n8n webhook:', error);
      
      if (error instanceof AppError) {
        return errorResponse(res, error.message, error.statusCode);
      }
      
      return errorResponse(res, 'Internal server error', 500);
    }
  });

  /**
   * Handle n8n workflow execution start webhook
   */
  handleExecutionStart = asyncHandler(async (req: Request, res: Response) => {
    try {
      const payload = extractWebhookPayload(req);
      if (!payload) {
        return errorResponse(res, 'Invalid webhook payload', 400);
      }

      logger.info('Execution started webhook received', {
        executionId: payload.executionId,
        workflowId: payload.workflowId,
      });

      // Update execution status to running
      await executionService.updateExecutionStatus(
        payload.executionId,
        'RUNNING' as any
      );

      return success(res, { message: 'Execution start processed' });

    } catch (error) {
      logger.error('Error processing execution start webhook:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  });

  /**
   * Handle n8n workflow execution completion webhook
   */
  handleExecutionComplete = asyncHandler(async (req: Request, res: Response) => {
    try {
      const payload = extractWebhookPayload(req);
      if (!payload) {
        return errorResponse(res, 'Invalid webhook payload', 400);
      }

      logger.info('Execution completed webhook received', {
        executionId: payload.executionId,
        workflowId: payload.workflowId,
        finished: payload.finished,
      });

      const status = getExecutionStatusFromPayload(payload);
      const errorMessage = getErrorMessageFromPayload(payload);
      const outputData = getOutputDataFromPayload(payload);

      // Update execution with final result
      await executionService.updateExecutionWithResult(
        payload.executionId,
        status === 'success' ? 'SUCCESS' as any : 'FAILED' as any,
        outputData,
        errorMessage
      );

      return success(res, { message: 'Execution completion processed' });

    } catch (error) {
      logger.error('Error processing execution completion webhook:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  });

  /**
   * Health check endpoint for webhook service
   */
  healthCheck = asyncHandler(async (req: Request, res: Response) => {
    return success(res, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'webhook-service',
    });
  });

  /**
   * Process webhook payload and update execution
   */
  private async processWebhookPayload(payload: any): Promise<void> {
    const { executionId, finished } = payload;

    if (!finished) {
      // Execution is still running, update status
      await executionService.updateExecutionStatus(executionId, 'RUNNING' as any);
      return;
    }

    // Execution is finished, determine final status
    const status = getExecutionStatusFromPayload(payload);
    const errorMessage = getErrorMessageFromPayload(payload);
    const outputData = getOutputDataFromPayload(payload);

    // Update execution with final result
    await executionService.updateExecutionWithResult(
      executionId,
      status === 'success' ? 'SUCCESS' as any : 'FAILED' as any,
      outputData,
      errorMessage
    );

    logger.info('Webhook payload processed', {
      executionId,
      status,
      hasOutput: !!outputData,
      hasError: !!errorMessage,
    });
  }
}

// Export singleton instance
export const webhookController = new WebhookController();