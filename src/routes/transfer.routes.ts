import { Router } from 'express';
import { transferController } from '../controllers';
import { asyncHandler, validateIdempotencyKey, validateTransferBody, validateUUID } from '../middleware';

const router = Router();

/**
 * Transfer Routes
 * 
 * POST   /              - Execute idempotent transfer
 * GET    /:transactionId - Get transaction by ID
 * GET    /idempotency/:key - Get transaction by idempotency key
 */

router.post(
  '/',
  validateIdempotencyKey,
  validateTransferBody,
  asyncHandler(transferController.createTransfer.bind(transferController))
);

router.get(
  '/idempotency/:key',
  asyncHandler(transferController.getTransactionByIdempotencyKey.bind(transferController))
);

router.get(
  '/:transactionId',
  validateUUID('transactionId'),
  asyncHandler(transferController.getTransactionById.bind(transferController))
);

export default router;
