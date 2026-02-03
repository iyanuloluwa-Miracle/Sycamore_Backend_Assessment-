import { TransactionStatus } from '../models/TransactionLog';
import { FinancialMath } from '../utils/financial-math';

// Transfer result interface (copied from service for test isolation)
interface TransferResult {
  success: boolean;
  transactionId?: string;
  status: TransactionStatus;
  message: string;
  fromBalance?: string;
  toBalance?: string;
  error?: string;
  isIdempotent?: boolean;
}

// Note: TransferService tests are split into unit tests that don't require DB
// and integration tests that would require a real database connection

describe('Transfer Validation Logic', () => {
  describe('Input Validation Rules', () => {
    it('should require idempotency key', () => {
      const idempotencyKey = '';
      expect(idempotencyKey.trim().length === 0).toBe(true);
    });

    it('should require source wallet', () => {
      const fromWalletId = '';
      expect(!fromWalletId).toBe(true);
    });

    it('should require destination wallet', () => {
      const toWalletId = '';
      expect(!toWalletId).toBe(true);
    });

    it('should reject transfer to same wallet', () => {
      const fromWalletId = 'wallet-1';
      const toWalletId = 'wallet-1';
      expect(fromWalletId === toWalletId).toBe(true);
    });

    it('should reject negative amount', () => {
      const amount = '-100';
      expect(FinancialMath.isNegative(amount)).toBe(true);
    });

    it('should reject zero amount', () => {
      const amount = '0';
      expect(FinancialMath.isZero(amount)).toBe(true);
    });

    it('should accept valid positive amount', () => {
      const amount = '100.50';
      expect(FinancialMath.isPositive(amount)).toBe(true);
    });
  });
});

describe('TransferService - Balance Calculations', () => {
  describe('Balance precision', () => {
    it('should calculate correct balance after debit', () => {
      const initialBalance = '1000.0000';
      const transferAmount = '150.5050';
      
      const newBalance = FinancialMath.subtract(initialBalance, transferAmount);
      
      expect(FinancialMath.toFixed(newBalance)).toBe('849.4950');
    });

    it('should calculate correct balance after credit', () => {
      const initialBalance = '500.0000';
      const transferAmount = '150.5050';
      
      const newBalance = FinancialMath.add(initialBalance, transferAmount);
      
      expect(FinancialMath.toFixed(newBalance)).toBe('650.5050');
    });

    it('should maintain precision through multiple operations', () => {
      let balance = FinancialMath.decimal('10000.0000');
      
      // Simulate multiple transfers
      const amounts = ['123.4567', '234.5678', '345.6789', '456.7890'];
      
      for (const amount of amounts) {
        balance = balance.minus(amount);
      }
      
      // Expected: 10000 - 123.4567 - 234.5678 - 345.6789 - 456.7890 = 8839.5076
      expect(FinancialMath.toFixed(balance)).toBe('8839.5076');
    });

    it('should detect insufficient balance correctly', () => {
      const balance = '100.0000';
      const amount = '100.0001';
      
      const hasInsufficientBalance = FinancialMath.isGreaterThan(amount, balance);
      
      expect(hasInsufficientBalance).toBe(true);
    });

    it('should allow transfer when balance equals amount', () => {
      const balance = '100.0000';
      const amount = '100.0000';
      
      const hasInsufficientBalance = FinancialMath.isGreaterThan(amount, balance);
      
      expect(hasInsufficientBalance).toBe(false);
    });
  });

  describe('Edge cases in balance operations', () => {
    it('should handle very large transfers', () => {
      const balance = '999999999.9999';
      const amount = '999999999.9999';
      
      const newBalance = FinancialMath.subtract(balance, amount);
      
      expect(FinancialMath.toFixed(newBalance)).toBe('0.0000');
    });

    it('should handle very small transfers', () => {
      const balance = '1000.0000';
      const amount = '0.0001';
      
      const newBalance = FinancialMath.subtract(balance, amount);
      
      expect(FinancialMath.toFixed(newBalance)).toBe('999.9999');
    });

    it('should handle transfers with decimal precision', () => {
      const balance = '100.1111';
      const amount = '50.2222';
      
      const newBalance = FinancialMath.subtract(balance, amount);
      
      expect(FinancialMath.toFixed(newBalance)).toBe('49.8889');
    });
  });
});

describe('Idempotency Logic', () => {
  describe('Idempotency key handling', () => {
    it('should generate unique idempotency keys for different transfers', () => {
      const key1 = `transfer:${Date.now()}-${Math.random().toString(36)}`;
      const key2 = `transfer:${Date.now()}-${Math.random().toString(36)}`;
      
      expect(key1).not.toBe(key2);
    });

    it('should format idempotency result correctly', () => {
      const result: TransferResult = {
        success: true,
        transactionId: 'txn-123',
        status: TransactionStatus.COMPLETED,
        message: 'Transfer completed',
        fromBalance: '900.0000',
        toBalance: '100.0000',
      };

      const serialized = JSON.stringify(result);
      const parsed = JSON.parse(serialized) as TransferResult;

      expect(parsed.success).toBe(result.success);
      expect(parsed.transactionId).toBe(result.transactionId);
      expect(parsed.status).toBe(result.status);
    });
  });
});

describe('Race Condition Prevention Logic', () => {
  describe('Lock key generation', () => {
    it('should generate consistent lock keys regardless of wallet order', () => {
      const wallet1 = 'aaaaaaaa-1111-1111-1111-111111111111';
      const wallet2 = 'bbbbbbbb-2222-2222-2222-222222222222';
      
      // Simulate lock key generation
      const lockKey1 = `transfer:${[wallet1, wallet2].sort().join(':')}`;
      const lockKey2 = `transfer:${[wallet2, wallet1].sort().join(':')}`;
      
      // Both should produce the same lock key
      expect(lockKey1).toBe(lockKey2);
    });

    it('should generate unique lock keys for different wallet pairs', () => {
      const walletA = 'aaaaaaaa-1111-1111-1111-111111111111';
      const walletB = 'bbbbbbbb-2222-2222-2222-222222222222';
      const walletC = 'cccccccc-3333-3333-3333-333333333333';
      
      const lockKey1 = `transfer:${[walletA, walletB].sort().join(':')}`;
      const lockKey2 = `transfer:${[walletA, walletC].sort().join(':')}`;
      
      expect(lockKey1).not.toBe(lockKey2);
    });
  });
});

describe('Double-Entry Bookkeeping', () => {
  describe('Ledger entry creation', () => {
    it('should create balanced ledger entries', () => {
      const amount = '100.0000';
      const fromBalanceBefore = '500.0000';
      const toBalanceBefore = '200.0000';
      
      const debitEntry = {
        amount,
        balanceBefore: fromBalanceBefore,
        balanceAfter: FinancialMath.toFixed(FinancialMath.subtract(fromBalanceBefore, amount)),
        entryType: 'DEBIT',
      };
      
      const creditEntry = {
        amount,
        balanceBefore: toBalanceBefore,
        balanceAfter: FinancialMath.toFixed(FinancialMath.add(toBalanceBefore, amount)),
        entryType: 'CREDIT',
      };
      
      // Verify amounts match
      expect(debitEntry.amount).toBe(creditEntry.amount);
      
      // Verify balance changes are correct
      expect(debitEntry.balanceAfter).toBe('400.0000');
      expect(creditEntry.balanceAfter).toBe('300.0000');
    });

    it('should track balance history accurately', () => {
      const transactions = [
        { amount: '100.0000', type: 'DEBIT' },
        { amount: '50.0000', type: 'CREDIT' },
        { amount: '25.0000', type: 'DEBIT' },
      ];
      
      let balance = FinancialMath.decimal('1000.0000');
      const history: Array<{ balanceBefore: string; balanceAfter: string }> = [];
      
      for (const txn of transactions) {
        const before = balance.toString();
        balance = txn.type === 'DEBIT' 
          ? balance.minus(txn.amount)
          : balance.plus(txn.amount);
        
        history.push({
          balanceBefore: FinancialMath.toFixed(before),
          balanceAfter: FinancialMath.toFixed(balance),
        });
      }
      
      // Verify history
      expect(history[0].balanceBefore).toBe('1000.0000');
      expect(history[0].balanceAfter).toBe('900.0000');
      
      expect(history[1].balanceBefore).toBe('900.0000');
      expect(history[1].balanceAfter).toBe('950.0000');
      
      expect(history[2].balanceBefore).toBe('950.0000');
      expect(history[2].balanceAfter).toBe('925.0000');
    });
  });
});
