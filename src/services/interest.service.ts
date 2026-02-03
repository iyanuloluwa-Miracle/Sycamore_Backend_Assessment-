import { Transaction } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database/connection';
import { Wallet, TransactionLog, LedgerEntry, InterestAccrual } from '../models';
import { TransactionType, TransactionStatus } from '../models/TransactionLog';
import { EntryType } from '../models/LedgerEntry';
import { FinancialMath } from '../utils/financial-math';
import config from '../config';

// Interest calculation result
export interface InterestCalculationResult {
  walletId: string;
  principalAmount: string;
  interestAmount: string;
  dailyRate: string;
  annualRate: string;
  daysInYear: number;
  isLeapYear: boolean;
  accrualDate: string;
}

// Apply interest result
export interface ApplyInterestResult {
  success: boolean;
  message: string;
  accruals: InterestCalculationResult[];
  totalInterest: string;
  error?: string;
}

/**
 * Interest Service
 * Handles daily interest calculation and accrual at 27.5% per annum
 */
export class InterestService {
  private readonly annualRate: number;

  constructor(annualRate?: number) {
    this.annualRate = annualRate ?? config.annualInterestRate;
  }

  /**
   * Calculate daily interest for a specific amount
   * @param principal - Principal amount
   * @param date - Date for calculation (affects leap year handling)
   */
  calculateDailyInterest(principal: string | number, date: Date = new Date()): InterestCalculationResult {
    const year = date.getFullYear();
    const isLeapYear = FinancialMath.isLeapYear(year);
    const daysInYear = FinancialMath.getDaysInYear(year);

    const dailyRate = FinancialMath.calculateDailyRate(this.annualRate, daysInYear);
    const interestAmount = FinancialMath.calculateDailyInterest(principal, this.annualRate, daysInYear);

    // Format date as YYYY-MM-DD
    const accrualDate = date.toISOString().split('T')[0];

    return {
      walletId: '',
      principalAmount: FinancialMath.toFixed(principal),
      interestAmount: FinancialMath.toFixed(interestAmount),
      dailyRate: dailyRate.toFixed(10), // Higher precision for rate
      annualRate: this.annualRate.toString(),
      daysInYear,
      isLeapYear,
      accrualDate,
    };
  }

  /**
   * Calculate interest for multiple days
   * @param principal - Principal amount
   * @param days - Number of days
   * @param startDate - Start date for calculation
   */
  calculateInterestForDays(
    principal: string | number,
    days: number,
    startDate: Date = new Date()
  ): { totalInterest: string; dailyBreakdown: InterestCalculationResult[] } {
    const dailyBreakdown: InterestCalculationResult[] = [];
    let totalInterest = FinancialMath.decimal('0');

    const currentDate = new Date(startDate);

    for (let i = 0; i < days; i++) {
      const result = this.calculateDailyInterest(principal, currentDate);
      dailyBreakdown.push(result);
      totalInterest = totalInterest.plus(result.interestAmount);
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      totalInterest: FinancialMath.toFixed(totalInterest),
      dailyBreakdown,
    };
  }

  /**
   * Calculate annual interest
   * @param principal - Principal amount
   * @param year - Year for calculation
   */
  calculateAnnualInterest(principal: string | number, year: number = new Date().getFullYear()): string {
    const daysInYear = FinancialMath.getDaysInYear(year);
    const interest = FinancialMath.calculateInterestForDays(
      principal,
      this.annualRate,
      daysInYear,
      daysInYear
    );
    return FinancialMath.toFixed(interest);
  }

  /**
   * Accrue daily interest for a wallet (record without applying)
   * @param walletId - Wallet ID
   * @param date - Date for accrual
   */
  async accrueInterestForWallet(
    walletId: string,
    date: Date = new Date()
  ): Promise<InterestCalculationResult | null> {
    const wallet = await Wallet.findByPk(walletId);
    
    if (!wallet || !wallet.isActive) {
      return null;
    }

    // Don't accrue interest on zero or negative balances
    if (FinancialMath.isNegative(wallet.balance) || FinancialMath.isZero(wallet.balance)) {
      return null;
    }

    const accrualDate = date.toISOString().split('T')[0];

    // Check if already accrued for this date
    const existing = await InterestAccrual.findOne({
      where: { walletId, accrualDate },
    });

    if (existing) {
      return {
        walletId,
        principalAmount: existing.principalAmount,
        interestAmount: existing.interestAmount,
        dailyRate: existing.dailyRate,
        annualRate: existing.annualRate,
        daysInYear: existing.daysInYear,
        isLeapYear: existing.isLeapYear,
        accrualDate: existing.accrualDate,
      };
    }

    const calculation = this.calculateDailyInterest(wallet.balance, date);
    calculation.walletId = walletId;

    // Store accrual record
    await InterestAccrual.create({
      walletId,
      principalAmount: calculation.principalAmount,
      interestAmount: calculation.interestAmount,
      annualRate: calculation.annualRate,
      dailyRate: calculation.dailyRate,
      accrualDate: calculation.accrualDate,
      daysInYear: calculation.daysInYear,
      isLeapYear: calculation.isLeapYear,
      isApplied: false,
    });

    return calculation;
  }

  /**
   * Accrue daily interest for all active wallets
   * @param date - Date for accrual
   */
  async accrueInterestForAllWallets(date: Date = new Date()): Promise<InterestCalculationResult[]> {
    const wallets = await Wallet.findAll({
      where: { isActive: true },
    });

    const results: InterestCalculationResult[] = [];

    for (const wallet of wallets) {
      const result = await this.accrueInterestForWallet(wallet.id, date);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Apply accrued interest to wallet balances
   * This credits the interest to the wallet and marks accruals as applied
   * @param walletId - Optional wallet ID to apply for specific wallet
   * @param date - Date of accruals to apply
   */
  async applyAccruedInterest(walletId?: string, date?: Date): Promise<ApplyInterestResult> {
    const whereClause: Record<string, unknown> = { isApplied: false };
    
    if (walletId) {
      whereClause.walletId = walletId;
    }
    
    if (date) {
      whereClause.accrualDate = date.toISOString().split('T')[0];
    }

    const pendingAccruals = await InterestAccrual.findAll({
      where: whereClause,
      include: [{ model: Wallet, as: 'wallet' }],
    });

    if (pendingAccruals.length === 0) {
      return {
        success: true,
        message: 'No pending interest accruals to apply',
        accruals: [],
        totalInterest: '0.0000',
      };
    }

    const results: InterestCalculationResult[] = [];
    let totalInterest = FinancialMath.decimal('0');

    try {
      await sequelize.transaction(
        { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
        async (t) => {
          for (const accrual of pendingAccruals) {
            const wallet = await Wallet.findByPk(accrual.walletId, {
              lock: t.LOCK.UPDATE,
              transaction: t,
            });

            if (!wallet) continue;

            // Create idempotency key for interest credit
            const idempotencyKey = `interest:${accrual.walletId}:${accrual.accrualDate}`;

            // Create transaction log
            const transactionLog = await TransactionLog.create(
              {
                idempotencyKey,
                fromWalletId: null, // Interest comes from system
                toWalletId: accrual.walletId,
                amount: accrual.interestAmount,
                type: TransactionType.INTEREST,
                status: TransactionStatus.PENDING,
                description: `Daily interest credit for ${accrual.accrualDate}`,
                metadata: {
                  principalAmount: accrual.principalAmount,
                  annualRate: accrual.annualRate,
                  dailyRate: accrual.dailyRate,
                  daysInYear: accrual.daysInYear,
                  isLeapYear: accrual.isLeapYear,
                },
              },
              { transaction: t }
            );

            // Calculate new balance
            const newBalance = FinancialMath.add(wallet.balance, accrual.interestAmount);

            // Update wallet balance
            await wallet.update(
              { balance: newBalance.toFixed(4) },
              { transaction: t }
            );

            // Create ledger entry
            await LedgerEntry.create(
              {
                transactionLogId: transactionLog.id,
                walletId: accrual.walletId,
                entryType: EntryType.CREDIT,
                amount: accrual.interestAmount,
                balanceBefore: wallet.balance,
                balanceAfter: newBalance.toFixed(4),
                description: `Interest credit: ${accrual.annualRate}% annual rate`,
              },
              { transaction: t }
            );

            // Update transaction log to completed
            await transactionLog.update(
              {
                status: TransactionStatus.COMPLETED,
                completedAt: new Date(),
              },
              { transaction: t }
            );

            // Mark accrual as applied
            await accrual.update(
              {
                isApplied: true,
                appliedAt: new Date(),
                transactionLogId: transactionLog.id,
              },
              { transaction: t }
            );

            results.push({
              walletId: accrual.walletId,
              principalAmount: accrual.principalAmount,
              interestAmount: accrual.interestAmount,
              dailyRate: accrual.dailyRate,
              annualRate: accrual.annualRate,
              daysInYear: accrual.daysInYear,
              isLeapYear: accrual.isLeapYear,
              accrualDate: accrual.accrualDate,
            });

            totalInterest = totalInterest.plus(accrual.interestAmount);
          }
        }
      );

      return {
        success: true,
        message: `Successfully applied ${results.length} interest accruals`,
        accruals: results,
        totalInterest: FinancialMath.toFixed(totalInterest),
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to apply interest accruals',
        accruals: [],
        totalInterest: '0.0000',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get interest history for a wallet
   * @param walletId - Wallet ID
   * @param limit - Number of records
   * @param offset - Offset for pagination
   */
  async getInterestHistory(
    walletId: string,
    limit: number = 30,
    offset: number = 0
  ): Promise<InterestAccrual[]> {
    return InterestAccrual.findAll({
      where: { walletId },
      order: [['accrualDate', 'DESC']],
      limit,
      offset,
    });
  }

  /**
   * Get total accrued interest for a wallet
   * @param walletId - Wallet ID
   * @param applied - Filter by applied status
   */
  async getTotalAccruedInterest(walletId: string, applied?: boolean): Promise<string> {
    const whereClause: Record<string, unknown> = { walletId };
    
    if (typeof applied === 'boolean') {
      whereClause.isApplied = applied;
    }

    const accruals = await InterestAccrual.findAll({ where: whereClause });
    
    let total = FinancialMath.decimal('0');
    for (const accrual of accruals) {
      total = total.plus(accrual.interestAmount);
    }

    return FinancialMath.toFixed(total);
  }

  /**
   * Simulate interest over a period
   * Useful for projections and testing
   */
  simulateInterest(
    principal: string | number,
    days: number,
    startDate: Date = new Date()
  ): {
    projectedBalance: string;
    totalInterest: string;
    dailyBreakdown: Array<{
      date: string;
      principal: string;
      interest: string;
      balance: string;
    }>;
  } {
    const breakdown: Array<{
      date: string;
      principal: string;
      interest: string;
      balance: string;
    }> = [];

    let currentBalance = FinancialMath.decimal(principal);
    let totalInterest = FinancialMath.decimal('0');
    const currentDate = new Date(startDate);

    for (let i = 0; i < days; i++) {
      const year = currentDate.getFullYear();
      const daysInYear = FinancialMath.getDaysInYear(year);
      const dailyInterest = FinancialMath.calculateDailyInterest(
        currentBalance.toString(),
        this.annualRate,
        daysInYear
      );

      totalInterest = totalInterest.plus(dailyInterest);
      currentBalance = currentBalance.plus(dailyInterest);

      breakdown.push({
        date: currentDate.toISOString().split('T')[0],
        principal: FinancialMath.toFixed(currentBalance.minus(dailyInterest)),
        interest: FinancialMath.toFixed(dailyInterest),
        balance: FinancialMath.toFixed(currentBalance),
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      projectedBalance: FinancialMath.toFixed(currentBalance),
      totalInterest: FinancialMath.toFixed(totalInterest),
      dailyBreakdown: breakdown,
    };
  }
}

// Export singleton instance with default rate
export const interestService = new InterestService();
export default interestService;
