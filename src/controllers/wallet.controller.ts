import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Wallet, TransactionLog, LedgerEntry } from '../models';
import { transferService } from '../services';

/**
 * HTTP handlers for wallet-related endpoints.
 */
export class WalletController {

  async getWallet(req: Request, res: Response): Promise<void> {
    const { walletId } = req.params;

    const wallet = await Wallet.findByPk(walletId);

    if (!wallet) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Wallet not found',
          code: 'NOT_FOUND',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: wallet,
    });
  }

  async getBalance(req: Request, res: Response): Promise<void> {
    const { walletId } = req.params;

    const balance = await transferService.getWalletBalance(walletId);

    if (balance === null) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Wallet not found',
          code: 'NOT_FOUND',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        walletId,
        balance,
      },
    });
  }

  async getHistory(req: Request, res: Response): Promise<void> {
    const { walletId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const wallet = await Wallet.findByPk(walletId);
    if (!wallet) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Wallet not found',
          code: 'NOT_FOUND',
        },
      });
      return;
    }

    const transactions = await transferService.getTransactionHistory(walletId, limit, offset);

    const total = await TransactionLog.count({
      where: {
        [Op.or]: [
          { fromWalletId: walletId },
          { toWalletId: walletId },
        ],
      },
    });

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + transactions.length < total,
        },
      },
    });
  }

  async getLedger(req: Request, res: Response): Promise<void> {
    const { walletId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const wallet = await Wallet.findByPk(walletId);
    if (!wallet) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Wallet not found',
          code: 'NOT_FOUND',
        },
      });
      return;
    }

    const ledgerEntries = await LedgerEntry.findAll({
      where: { walletId },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: TransactionLog,
          as: 'transactionLog',
          attributes: ['id', 'type', 'status', 'description'],
        },
      ],
    });

    const total = await LedgerEntry.count({ where: { walletId } });

    res.json({
      success: true,
      data: {
        ledgerEntries,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + ledgerEntries.length < total,
        },
      },
    });
  }

  async getByUserId(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;

    const wallet = await transferService.getWalletByUserId(userId);

    if (!wallet) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Wallet not found for the given user',
          code: 'NOT_FOUND',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: wallet,
    });
  }

  async createWallet(req: Request, res: Response): Promise<void> {
    const { userId, initialBalance = 0, currency = 'NGN' } = req.body;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: {
          message: 'userId is required',
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    const existing = await Wallet.findOne({ where: { userId } });
    if (existing) {
      res.status(400).json({
        success: false,
        error: {
          message: 'User already has a wallet',
          code: 'DUPLICATE_WALLET',
        },
      });
      return;
    }

    const wallet = await Wallet.create({
      userId,
      balance: initialBalance.toString(),
      currency,
    });

    res.status(201).json({
      success: true,
      data: wallet,
    });
  }
}

export const walletController = new WalletController();
export default walletController;
