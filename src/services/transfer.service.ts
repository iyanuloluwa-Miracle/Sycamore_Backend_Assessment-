import { Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database/connection';
import { Wallet, TransactionLog, LedgerEntry } from '../models';
import { TransactionType, TransactionStatus } from '../models/TransactionLog';
import { EntryType } from '../models/LedgerEntry';
import { FinancialMath } from '../utils/financial-math';
import redisClient from '../utils/redis';

export interface TransferRequest {
  idempotencyKey: string;
  fromWalletId: string;
  toWalletId: string;
  amount: string | number;
  description?: string;
  metadata?: Record<string, unknown>;
}

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
 * Handles wallet-to-wallet transfers with idempotency guarantees.
 * 
 * The tricky part here is preventing double-spends while still being
 * resilient to network failures. We use a combination of Redis locks
 * for distributed coordination and SERIALIZABLE transactions for
 * database-level consistency.
 */
export class TransferService {
  private static readonly LOCK_TTL_MS = 10000;
  private static readonly IDEMPOTENCY_TTL_SECONDS = 86400; // 24h

  /**
   * Execute a transfer between two wallets.
   * 
   * The flow is intentionally verbose to ensure we can always recover
   * to a known state if something fails mid-transfer:
   * 
   * 1. Check if we've seen this idempotency key before (fast path)
   * 2. Acquire a distributed lock on the wallet pair
   * 3. Create a PENDING transaction log (so we have a record even if we crash)
   * 4. Move the money and update the ledger
   * 5. Mark transaction COMPLETED and cache the result
   */
  async transfer(request: TransferRequest): Promise<TransferResult> {
    const { idempotencyKey, fromWalletId, toWalletId, amount, description, metadata } = request;

    const validationError = this.validateTransferRequest(request);
    if (validationError) {
      return {
        success: false,
        status: TransactionStatus.FAILED,
        message: validationError,
        error: validationError,
      };
    }

    // Fast path: if we've processed this key before, return the cached result
    const cachedResult = await redisClient.getIdempotencyResult(idempotencyKey);
    if (cachedResult) {
      const parsed = JSON.parse(cachedResult) as TransferResult;
      return { ...parsed, isIdempotent: true };
    }

    // Belt-and-suspenders: also check the database in case Redis was cleared
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

    // Sort wallet IDs to prevent deadlocks when locking
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

    let transactionLog: TransactionLog | undefined;

    try {
      const result = await sequelize.transaction(
        { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
        async (t) => {
          // Create the transaction record first. If we crash after this point,
          // at least we have evidence that something was attempted.
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

          // Lock both wallets. Order doesn't matter here since we're in
          // a SERIALIZABLE transaction, but we lock source first by convention.
          const fromWallet = await Wallet.findOne({
            where: { id: fromWalletId, isActive: true },
            lock: t.LOCK.UPDATE,
            transaction: t,
          });

          if (!fromWallet) {
            throw new Error('Source wallet not found or inactive');
          }

          const toWallet = await Wallet.findOne({
            where: { id: toWalletId, isActive: true },
            lock: t.LOCK.UPDATE,
            transaction: t,
          });

          if (!toWallet) {
            throw new Error('Destination wallet not found or inactive');
          }

          // Balance check — the whole point of all this locking
          const transferAmount = FinancialMath.decimal(amount);
          const currentBalance = FinancialMath.decimal(fromWallet.balance);

          if (FinancialMath.isGreaterThan(transferAmount.toString(), currentBalance.toString())) {
            throw new Error(
              `Insufficient balance. Available: ${currentBalance.toFixed(4)}, Required: ${transferAmount.toFixed(4)}`
            );
          }

          const newFromBalance = FinancialMath.subtract(fromWallet.balance, amount);
          const newToBalance = FinancialMath.add(toWallet.balance, amount);

          await fromWallet.update(
            { balance: newFromBalance.toFixed(4) },
            { transaction: t }
          );

          await toWallet.update(
            { balance: newToBalance.toFixed(4) },
            { transaction: t }
          );

          // Double-entry bookkeeping: every transfer creates two ledger entries
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

      // Cache the result so subsequent retries are fast
      await redisClient.setIdempotencyResult(
        idempotencyKey,
        JSON.stringify(result),
        TransferService.IDEMPOTENCY_TTL_SECONDS
      );

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

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

      // Cache failures too — a failed transfer shouldn't succeed on retry
      await redisClient.setIdempotencyResult(
        idempotencyKey,
        JSON.stringify(failedResult),
        TransferService.IDEMPOTENCY_TTL_SECONDS
      );

      return failedResult;

    } finally {
      await redisClient.releaseLock(lockKey, lockValue);
    }
  }

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

  async getTransactionById(transactionId: string): Promise<TransactionLog | null> {
    return TransactionLog.findByPk(transactionId, {
      include: [
        { model: Wallet, as: 'fromWallet' },
        { model: Wallet, as: 'toWallet' },
        { model: LedgerEntry, as: 'ledgerEntries' },
      ],
    });
  }

  async getWalletBalance(walletId: string): Promise<string | null> {
    const wallet = await Wallet.findByPk(walletId);
    return wallet?.balance || null;
  }

  async getWalletByUserId(userId: string): Promise<Wallet | null> {
    return Wallet.findOne({ where: { userId } });
  }

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

export const transferService = new TransferService();
export default transferService;
