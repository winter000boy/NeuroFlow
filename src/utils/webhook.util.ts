import crypto from 'crypto';
import { Request } from 'express';
import { N8nWebhookPayload } from '../types/n8n.types';
import { logger } from '../config/logger.config';

/**
 * Verify webhook signature from n8n
 * This is a placeholder implementation - actual signature verification
 * would depend on n8n's webhook configuration
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    // Compare signatures using timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    logger.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Extract webhook payload from request
 */
export function extractWebhookPayload(req: Request): N8nWebhookPayload | null {
  try {
    const payload = req.body;
    
    // Validate required fields
    if (!payload.executionId || !payload.workflowId) {
      logger.warn('Invalid webhook payload: missing required fields', payload);
      return null;
    }

    return {
      executionId: payload.executionId,
      workflowId: payload.workflowId,
      userId: payload.userId,
      retryOf: payload.retryOf,
      finished: Boolean(payload.finished),
      mode: payload.mode || 'webhook',
      startedAt: payload.startedAt,
      stoppedAt: payload.stoppedAt,
      data: payload.data,
    };
  } catch (error) {
    logger.error('Error extracting webhook payload:', error);
    return null;
  }
}

/**
 * Validate webhook payload structure
 */
export function validateWebhookPayload(payload: any): payload is N8nWebhookPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof payload.executionId === 'string' &&
    typeof payload.workflowId === 'string' &&
    typeof payload.finished === 'boolean' &&
    typeof payload.startedAt === 'string'
  );
}

/**
 * Extract execution status from webhook payload
 */
export function getExecutionStatusFromPayload(payload: N8nWebhookPayload): 'success' | 'failed' | 'running' {
  if (!payload.finished) {
    return 'running';
  }
  
  if (payload.data?.resultData?.error) {
    return 'failed';
  }
  
  return 'success';
}

/**
 * Extract error message from webhook payload
 */
export function getErrorMessageFromPayload(payload: N8nWebhookPayload): string | undefined {
  return payload.data?.resultData?.error?.message;
}

/**
 * Extract output data from webhook payload
 */
export function getOutputDataFromPayload(payload: N8nWebhookPayload): Record<string, any> | undefined {
  return payload.data?.resultData?.runData;
}