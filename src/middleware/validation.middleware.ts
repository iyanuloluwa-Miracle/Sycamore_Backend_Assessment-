import { Request, Response, NextFunction } from 'express';

/**
 * Validate idempotency key middleware
 */
export function validateIdempotencyKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;

  if (!idempotencyKey) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Idempotency-Key header or idempotencyKey in body is required',
        code: 'MISSING_IDEMPOTENCY_KEY',
      },
    });
    return;
  }

  // Attach to request for later use
  req.body.idempotencyKey = idempotencyKey;
  next();
}

/**
 * Validate transfer request body
 */
export function validateTransferBody(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { fromWalletId, toWalletId, amount } = req.body;

  const errors: string[] = [];

  if (!fromWalletId) {
    errors.push('fromWalletId is required');
  }

  if (!toWalletId) {
    errors.push('toWalletId is required');
  }

  if (fromWalletId && toWalletId && fromWalletId === toWalletId) {
    errors.push('Cannot transfer to the same wallet');
  }

  if (amount === undefined || amount === null) {
    errors.push('amount is required');
  } else if (isNaN(Number(amount)) || Number(amount) <= 0) {
    errors.push('amount must be a positive number');
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors,
      },
    });
    return;
  }

  next();
}

/**
 * Validate UUID format
 */
export function validateUUID(paramName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!value || !uuidRegex.test(value)) {
      res.status(400).json({
        success: false,
        error: {
          message: `Invalid ${paramName} format. Expected UUID.`,
          code: 'INVALID_UUID',
        },
      });
      return;
    }

    next();
  };
}

export default {
  validateIdempotencyKey,
  validateTransferBody,
  validateUUID,
};
