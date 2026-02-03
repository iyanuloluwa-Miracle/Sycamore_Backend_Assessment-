import { Router } from 'express';
import { transferController } from '../controllers';
import { asyncHandler, validateIdempotencyKey, validateTransferBody, validateUUID } from '../middleware';

const router = Router();

/**
 * @swagger
 * /transfer:
 *   post:
 *     summary: Execute a wallet transfer
 *     description: |
 *       Transfers funds between two wallets with full idempotency support.
 *       The same idempotency key will always return the same result, making retries safe.
 *       
 *       The transfer is atomic: either both wallets update or neither does.
 *     tags: [Transfers]
 *     parameters:
 *       - $ref: '#/components/parameters/IdempotencyKey'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransferRequest'
 *     responses:
 *       201:
 *         description: Transfer completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         transactionId:
 *                           type: string
 *                           format: uuid
 *                         status:
 *                           type: string
 *                           example: COMPLETED
 *                         fromBalance:
 *                           type: string
 *                           example: "9500.0000"
 *                         toBalance:
 *                           type: string
 *                           example: "10500.0000"
 *       200:
 *         description: Idempotent replay - returning cached result from previous request
 *       400:
 *         description: Validation error or insufficient funds
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Concurrent request in progress - retry with same idempotency key
 */
router.post(
  '/',
  validateIdempotencyKey,
  validateTransferBody,
  asyncHandler(transferController.createTransfer.bind(transferController))
);

/**
 * @swagger
 * /transfer/idempotency/{key}:
 *   get:
 *     summary: Look up transaction by idempotency key
 *     description: Retrieve a transaction using the original idempotency key from the request.
 *     tags: [Transfers]
 *     parameters:
 *       - name: key
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The idempotency key used when creating the transfer
 *     responses:
 *       200:
 *         description: Transaction found
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/TransactionLog'
 *       404:
 *         description: No transaction found for this idempotency key
 */
router.get(
  '/idempotency/:key',
  asyncHandler(transferController.getTransactionByIdempotencyKey.bind(transferController))
);

/**
 * @swagger
 * /transfer/{transactionId}:
 *   get:
 *     summary: Get transaction details
 *     description: Retrieve full transaction details including associated ledger entries.
 *     tags: [Transfers]
 *     parameters:
 *       - name: transactionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Transaction details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/TransactionLog'
 *       404:
 *         description: Transaction not found
 */
router.get(
  '/:transactionId',
  validateUUID('transactionId'),
  asyncHandler(transferController.getTransactionById.bind(transferController))
);

export default router;
