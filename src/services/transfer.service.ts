import { Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database/connection';
import { Wallet, TransactionLog, LedgerEntry } from '../models';
import { TransactionType, TransactionStatus } from '../models/TransactionLog';
import { EntryType } from '../models/LedgerEntry';
import { FinancialMath } from '../utils/financial-math';
import redisClient from '../utils/redis';

// Transfer request interface
export interface TransferRequest {
  idempotencyKey: string;
  fromWalletId: string;
  toWalletId: string;
  amount: string | number;
  description?: string;
  metadata?: Record<string, unknown>;
}

// Transfer result interface
export interface TransferResult {
  success: boolean;
  transactionId?: string;
  status: TransactionStatus;
  message: string;
  fromBalance?: string;
  toBalance?: string;
  error?: string;
  isIdempotent?: boolean;
}

/**
 * Wallet Transfer Service
 * Handles idempotent money transfers with race condition prevention
 */
export class TransferService {
  private static readonly LOCK_TTL_MS = 10000; // 10 seconds lock timeout
  private static readonly IDEMPOTENCY_TTL_SECONDS = 86400; // 24 hours

  /**
   * Execute an idempotent transfer between wallets
   * Implements double-spending prevention and PENDING state logging
   */
  async transfer(request: TransferRequest): Promise<TransferResult> {
    const { idempotencyKey, fromWalletId, toWalletId, amount, description, metadata } = request;

    // Validate input
    const validationError = this.validateTransferRequest(request);
    if (validationError) {
      return {
        success: false,
        status: TransactionStatus.FAILED,
        message: validationError,
        error: validationError,
      };
    }

    // Step 1: Check idempotency - return cached result if exists
    const cachedResult = await redisClient.getIdempotencyResult(idempotencyKey);
    if (cachedResult) {
      const parsed = JSON.parse(cachedResult) as TransferResult;
      return { ...parsed, isIdempotent: true };
    }

    // Step 2: Check if transaction already exists in database (double-safety)
    const existingTransaction = await TransactionLog.findOne({
      where: { idempotencyKey },
    });

    if (existingTransaction) {
      const result: TransferResult = {
        success: existingTransaction.status === TransactionStatus.COMPLETED,
        transactionId: existingTransaction.id,
        status: existingTransaction.status,
        message: `Transaction already processed with status: ${existingTransaction.status}`,
        isIdempotent: true,
      };
      return result;
    }

    // Step 3: Acquire distributed lock to prevent race conditions
    // Lock on both wallets to prevent concurrent modifications
    const lockKey = `transfer:${[fromWalletId, toWalletId].sort().join(':')}`;
    const lockValue = await redisClient.acquireLock(lockKey, TransferService.LOCK_TTL_MS);

    if (!lockValue) {
      return {
        success: false,
        status: TransactionStatus.PENDING,
        message: 'Transfer is being processed. Please retry with the same idempotency key.',
        error: 'CONCURRENT_REQUEST',
      };
    }

    // Initialize transaction log variable for access in catch block
    let transactionLog: TransactionLog | undefined;

    try {
      // Step 4: Execute transfer within a database transaction
      const result = await sequelize.transaction(
        { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
        async (t) => {
          // 4.1: Create PENDING transaction log BEFORE any balance changes
          transactionLog = await TransactionLog.create(
            {
              idempotencyKey,
              fromWalletId,
              toWalletId,
              amount: FinancialMath.toFixed(amount),
              type: TransactionType.TRANSFER,
              status: TransactionStatus.PENDING,
              description: description || 'Wallet transfer',
              metadata,
            },
            { transaction: t }
          );

          // 4.2: Lock and fetch source wallet with FOR UPDATE
          const fromWallet = await Wallet.findOne({
            where: { id: fromWalletId, isActive: true },
            lock: t.LOCK.UPDATE,
            transaction: t,
          });

          if (!fromWallet) {
            throw new Error('Source wallet not found or inactive');
          }

          // 4.3: Lock and fetch destination wallet with FOR UPDATE
          const toWallet = await Wallet.findOne({
            where: { id: toWalletId, isActive: true },
            lock: t.LOCK.UPDATE,
            transaction: t,
          });

          if (!toWallet) {
            throw new Error('Destination wallet not found or inactive');
          }

          // 4.4: Check sufficient balance (prevent double-spending)
          const transferAmount = FinancialMath.decimal(amount);
          const currentBalance = FinancialMath.decimal(fromWallet.balance);

          if (FinancialMath.isGreaterThan(transferAmount.toString(), currentBalance.toString())) {
            throw new Error(
              `Insufficient balance. Available: ${currentBalance.toFixed(4)}, Required: ${transferAmount.toFixed(4)}`
            );
          }

          // 4.5: Calculate new balances using precise math
          const newFromBalance = FinancialMath.subtract(fromWallet.balance, amount);
          const newToBalance = FinancialMath.add(toWallet.balance, amount);

          // 4.6: Update source wallet balance
          await fromWallet.update(
            { balance: newFromBalance.toFixed(4) },
            { transaction: t }
          );

          // 4.7: Update destination wallet balance
          await toWallet.update(
            { balance: newToBalance.toFixed(4) },
            { transaction: t }
          );

          // 4.8: Create ledger entries (double-entry bookkeeping)
          await LedgerEntry.bulkCreate(
            [
              {
                transactionLogId: transactionLog.id,
                walletId: fromWalletId,
                entryType: EntryType.DEBIT,
                amount: FinancialMath.toFixed(amount),
                balanceBefore: fromWallet.balance,
                balanceAfter: newFromBalance.toFixed(4),
                description: `Transfer to wallet ${toWalletId}`,
              },
              {
                transactionLogId: transactionLog.id,
                walletId: toWalletId,
                entryType: EntryType.CREDIT,
                amount: FinancialMath.toFixed(amount),
                balanceBefore: toWallet.balance,
                balanceAfter: newToBalance.toFixed(4),
                description: `Transfer from wallet ${fromWalletId}`,
              },
            ],
            { transaction: t }
          );

          // 4.9: Update transaction log to COMPLETED
          await transactionLog.update(
            {
              status: TransactionStatus.COMPLETED,
              completedAt: new Date(),
            },
            { transaction: t }
          );

          return {
            success: true,
            transactionId: transactionLog.id,
            status: TransactionStatus.COMPLETED,
            message: 'Transfer completed successfully',
            fromBalance: newFromBalance.toFixed(4),
            toBalance: newToBalance.toFixed(4),
          } as TransferResult;
        }
      );

      // Step 5: Cache successful result for idempotency
      await redisClient.setIdempotencyResult(
        idempotencyKey,
        JSON.stringify(result),
        TransferService.IDEMPOTENCY_TTL_SECONDS
      );

      return result;

    } catch (error) {
      // Handle transaction failure
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Update transaction log to FAILED if it was created
      if (transactionLog && transactionLog.id) {
        await TransactionLog.update(
          {
            status: TransactionStatus.FAILED,
            errorMessage,
          },
          { where: { id: transactionLog.id } }
        );
      }

      const failedResult: TransferResult = {
        success: false,
        transactionId: transactionLog ? transactionLog.id : undefined,
        status: TransactionStatus.FAILED,
        message: 'Transfer failed',
        error: errorMessage,
      };

      // Cache failed result to prevent retry with same idempotency key
      // causing inconsistent states
      await redisClient.setIdempotencyResult(
        idempotencyKey,
        JSON.stringify(failedResult),
        TransferService.IDEMPOTENCY_TTL_SECONDS
      );

      return failedResult;

    } finally {
      // Always release the lock
      await redisClient.releaseLock(lockKey, lockValue);
    }
  }

  /**
   * Validate transfer request
   */
  private validateTransferRequest(request: TransferRequest): string | null {
    const { idempotencyKey, fromWalletId, toWalletId, amount } = request;

    if (!idempotencyKey || idempotencyKey.trim().length === 0) {
      return 'Idempotency key is required';
    }

    if (!fromWalletId) {
      return 'Source wallet ID is required';
    }

    if (!toWalletId) {
      return 'Destination wallet ID is required';
    }

    if (fromWalletId === toWalletId) {
      return 'Cannot transfer to the same wallet';
    }

    if (!amount) {
      return 'Amount is required';
    }

    const amountStr = typeof amount === 'number' ? amount.toString() : amount;

    if (FinancialMath.isNegative(amountStr) || FinancialMath.isZero(amountStr)) {
      return 'Amount must be positive';
    }

    return null;
  }

  /**
   * Get transaction by idempotency key
   */
  async getTransactionByIdempotencyKey(idempotencyKey: string): Promise<TransactionLog | null> {
    return TransactionLog.findOne({
      where: { idempotencyKey },
      include: [
        { model: Wallet, as: 'fromWallet' },
        { model: Wallet, as: 'toWallet' },
        { model: LedgerEntry, as: 'ledgerEntries' },
      ],
    });
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(transactionId: string): Promise<TransactionLog | null> {
    return TransactionLog.findByPk(transactionId, {
      include: [
        { model: Wallet, as: 'fromWallet' },
        { model: Wallet, as: 'toWallet' },
        { model: LedgerEntry, as: 'ledgerEntries' },
      ],
    });
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(walletId: string): Promise<string | null> {
    const wallet = await Wallet.findByPk(walletId);
    return wallet?.balance || null;
  }

  /**
   * Get wallet by user ID
   */
  async getWalletByUserId(userId: string): Promise<Wallet | null> {
    return Wallet.findOne({ where: { userId } });
  }

  /**
   * Get transaction history for a wallet
   */
  async getTransactionHistory(
    walletId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<TransactionLog[]> {
    return TransactionLog.findAll({
      where: sequelize.literal(
        `("from_wallet_id" = '${walletId}' OR "to_wallet_id" = '${walletId}')`
      ),
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [
        { model: LedgerEntry, as: 'ledgerEntries' },
      ],
    });
  }
}

// Export singleton instance
export const transferService = new TransferService();
export default transferService;
