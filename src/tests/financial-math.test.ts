import { FinancialMath } from '../utils/financial-math';
import Decimal from 'decimal.js';

describe('FinancialMath Utility', () => {
  describe('Leap Year Detection', () => {
    it('should correctly identify leap years', () => {
      // Common leap years
      expect(FinancialMath.isLeapYear(2024)).toBe(true);
      expect(FinancialMath.isLeapYear(2028)).toBe(true);
      expect(FinancialMath.isLeapYear(2000)).toBe(true); // Century divisible by 400
      
      // Non-leap years
      expect(FinancialMath.isLeapYear(2023)).toBe(false);
      expect(FinancialMath.isLeapYear(2025)).toBe(false);
      expect(FinancialMath.isLeapYear(1900)).toBe(false); // Century not divisible by 400
      expect(FinancialMath.isLeapYear(2100)).toBe(false);
    });

    it('should return correct days in year', () => {
      expect(FinancialMath.getDaysInYear(2024)).toBe(366); // Leap year
      expect(FinancialMath.getDaysInYear(2023)).toBe(365); // Non-leap year
      expect(FinancialMath.getDaysInYear(2000)).toBe(366); // Leap year (century)
      expect(FinancialMath.getDaysInYear(1900)).toBe(365); // Non-leap year (century)
    });
  });

  describe('Daily Interest Rate Calculation', () => {
    const annualRate = 0.275; // 27.5%

    it('should calculate correct daily rate for non-leap year (365 days)', () => {
      const dailyRate = FinancialMath.calculateDailyRate(annualRate, 365);
      
      // 27.5% / 365 = 0.0007534246575...
      expect(dailyRate.toNumber()).toBeCloseTo(0.000753424657534, 10);
    });

    it('should calculate correct daily rate for leap year (366 days)', () => {
      const dailyRate = FinancialMath.calculateDailyRate(annualRate, 366);
      
      // 27.5% / 366 = 0.0007513661202...
      expect(dailyRate.toNumber()).toBeCloseTo(0.000751366120219, 10);
    });

    it('should handle string input for annual rate', () => {
      const dailyRate = FinancialMath.calculateDailyRate('0.275', 365);
      expect(dailyRate.toNumber()).toBeCloseTo(0.000753424657534, 10);
    });
  });

  describe('Daily Interest Calculation', () => {
    const annualRate = 0.275; // 27.5%

    it('should calculate correct daily interest for 100,000 (non-leap year)', () => {
      const principal = 100000;
      const daysInYear = 365;
      
      const interest = FinancialMath.calculateDailyInterest(principal, annualRate, daysInYear);
      
      // 100,000 × 0.275 / 365 = 75.34246575...
      expect(interest.toNumber()).toBeCloseTo(75.34246575, 4);
    });

    it('should calculate correct daily interest for 100,000 (leap year)', () => {
      const principal = 100000;
      const daysInYear = 366;
      
      const interest = FinancialMath.calculateDailyInterest(principal, annualRate, daysInYear);
      
      // 100,000 × 0.275 / 366 = 75.13661202...
      expect(interest.toNumber()).toBeCloseTo(75.13661202, 4);
    });

    it('should handle decimal principal amounts', () => {
      const principal = 50000.5;
      const daysInYear = 365;
      
      const interest = FinancialMath.calculateDailyInterest(principal, annualRate, daysInYear);
      
      // 50,000.5 × 0.275 / 365 = 37.67160274...
      expect(interest.toNumber()).toBeCloseTo(37.67160274, 4);
    });

    it('should handle string input for principal', () => {
      const interest = FinancialMath.calculateDailyInterest('100000', annualRate, 365);
      expect(interest.toNumber()).toBeCloseTo(75.34246575, 4);
    });

    it('should calculate zero interest for zero principal', () => {
      const interest = FinancialMath.calculateDailyInterest(0, annualRate, 365);
      expect(interest.toNumber()).toBe(0);
    });
  });

  describe('Interest for Multiple Days', () => {
    const annualRate = 0.275;

    it('should calculate correct interest for 30 days', () => {
      const principal = 100000;
      const days = 30;
      const daysInYear = 365;
      
      const interest = FinancialMath.calculateInterestForDays(principal, annualRate, days, daysInYear);
      
      // 100,000 × 0.275 × 30 / 365 = 2,260.273972...
      expect(interest.toNumber()).toBeCloseTo(2260.273972, 4);
    });

    it('should calculate correct annual interest (365 days)', () => {
      const principal = 100000;
      const days = 365;
      const daysInYear = 365;
      
      const interest = FinancialMath.calculateInterestForDays(principal, annualRate, days, daysInYear);
      
      // 100,000 × 0.275 = 27,500
      expect(interest.toNumber()).toBe(27500);
    });

    it('should calculate correct annual interest for leap year (366 days)', () => {
      const principal = 100000;
      const days = 366;
      const daysInYear = 366;
      
      const interest = FinancialMath.calculateInterestForDays(principal, annualRate, days, daysInYear);
      
      // 100,000 × 0.275 = 27,500
      expect(interest.toNumber()).toBe(27500);
    });
  });

  describe('Arithmetic Operations', () => {
    it('should add amounts with precision', () => {
      const result = FinancialMath.add('0.1', '0.2');
      expect(result.toString()).toBe('0.3');
      
      const result2 = FinancialMath.add('999999.9999', '0.0001');
      expect(result2.toString()).toBe('1000000');
    });

    it('should subtract amounts with precision', () => {
      const result = FinancialMath.subtract('1000', '0.01');
      expect(result.toString()).toBe('999.99');
      
      // Test floating point precision issue
      const result2 = FinancialMath.subtract('1.0', '0.9');
      expect(result2.toString()).toBe('0.1');
    });

    it('should multiply amounts with precision', () => {
      const result = FinancialMath.multiply('100000', '0.275');
      expect(result.toString()).toBe('27500');
    });

    it('should divide amounts with precision', () => {
      const result = FinancialMath.divide('27500', '365');
      expect(result.toNumber()).toBeCloseTo(75.34246575, 6);
    });
  });

  describe('Rounding', () => {
    it('should round to 4 decimal places by default', () => {
      const result = FinancialMath.round('123.456789');
      expect(result).toBe('123.4568'); // ROUND_HALF_UP
    });

    it('should round to specified decimal places', () => {
      const result = FinancialMath.round('123.456789', 2);
      expect(result).toBe('123.46');
    });

    it('should handle Decimal input', () => {
      const decimal = new Decimal('99.995');
      const result = FinancialMath.round(decimal, 2);
      expect(result).toBe('100.00');
    });
  });

  describe('Comparison Operations', () => {
    it('should correctly compare greater than', () => {
      expect(FinancialMath.isGreaterThan('100', '99.99')).toBe(true);
      expect(FinancialMath.isGreaterThan('100', '100')).toBe(false);
      expect(FinancialMath.isGreaterThan('99.99', '100')).toBe(false);
    });

    it('should correctly compare greater than or equal', () => {
      expect(FinancialMath.isGreaterThanOrEqual('100', '99.99')).toBe(true);
      expect(FinancialMath.isGreaterThanOrEqual('100', '100')).toBe(true);
      expect(FinancialMath.isGreaterThanOrEqual('99.99', '100')).toBe(false);
    });

    it('should correctly compare less than', () => {
      expect(FinancialMath.isLessThan('99.99', '100')).toBe(true);
      expect(FinancialMath.isLessThan('100', '100')).toBe(false);
      expect(FinancialMath.isLessThan('100', '99.99')).toBe(false);
    });

    it('should correctly check for zero', () => {
      expect(FinancialMath.isZero('0')).toBe(true);
      expect(FinancialMath.isZero('0.00')).toBe(true);
      expect(FinancialMath.isZero('0.0001')).toBe(false);
    });

    it('should correctly check for negative', () => {
      expect(FinancialMath.isNegative('-1')).toBe(true);
      expect(FinancialMath.isNegative('-0.01')).toBe(true);
      expect(FinancialMath.isNegative('0')).toBe(false);
      expect(FinancialMath.isNegative('1')).toBe(false);
    });

    it('should correctly check for positive', () => {
      expect(FinancialMath.isPositive('1')).toBe(true);
      expect(FinancialMath.isPositive('0.01')).toBe(true);
      expect(FinancialMath.isPositive('0')).toBe(false);
      expect(FinancialMath.isPositive('-1')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      const large = '999999999999999.9999';
      const result = FinancialMath.add(large, '0.0001');
      expect(result.toString()).toBe('1000000000000000');
    });

    it('should handle very small numbers', () => {
      const small = '0.0001';
      const result = FinancialMath.multiply(small, '0.0001');
      expect(result.toString()).toBe('0.00000001');
    });

    it('should maintain precision through multiple operations', () => {
      // Simulate daily interest calculation for 365 days
      const principal = '100000';
      const annualRate = '0.275';
      
      let total = FinancialMath.decimal('0');
      
      for (let i = 0; i < 365; i++) {
        const daily = FinancialMath.calculateDailyInterest(principal, annualRate, 365);
        total = total.plus(daily);
      }
      
      // Should equal annual interest of 27,500
      expect(FinancialMath.round(total, 4)).toBe('27500.0000');
    });
  });
});
