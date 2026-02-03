import { Request, Response } from 'express';
import { transferService } from '../services';
import { TransactionStatus } from '../models/TransactionLog';

/**
 * Transfer Controller
 * Handles HTTP request/response for transfer operations
 */
export class TransferController {
  /**
   * POST /api/transfer
   * Execute an idempotent money transfer
   */
  async createTransfer(req: Request, res: Response): Promise<void> {
    const { idempotencyKey, fromWalletId, toWalletId, amount, description, metadata } = req.body;

    const result = await transferService.transfer({
      idempotencyKey,
      fromWalletId,
      toWalletId,
      amount: amount.toString(),
      description,
      metadata,
    });

    if (result.success) {
      res.status(result.isIdempotent ? 200 : 201).json({
        success: true,
        data: result,
      });
    } else {
      const statusCode = result.error === 'CONCURRENT_REQUEST' ? 409 : 400;
      res.status(statusCode).json({
        success: false,
        error: {
          message: result.message,
          code: result.error,
          transactionId: result.transactionId,
          status: result.status,
        },
      });
    }
  }

  /**
   * GET /api/transfer/:transactionId
   * Get transaction by ID
   */
  async getTransactionById(req: Request, res: Response): Promise<void> {
    const { transactionId } = req.params;

    const transaction = await transferService.getTransactionById(transactionId);

    if (!transaction) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Transaction not found',
          code: 'NOT_FOUND',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: transaction,
    });
  }

  /**
   * GET /api/transfer/idempotency/:key
   * Get transaction by idempotency key
   */
  async getTransactionByIdempotencyKey(req: Request, res: Response): Promise<void> {
    const { key } = req.params;

    const transaction = await transferService.getTransactionByIdempotencyKey(key);

    if (!transaction) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Transaction not found for the given idempotency key',
          code: 'NOT_FOUND',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: transaction,
    });
  }
}

export const transferController = new TransferController();
export default transferController;
