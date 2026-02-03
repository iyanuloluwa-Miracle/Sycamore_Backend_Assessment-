import { InterestService } from '../services/interest.service';
import { FinancialMath } from '../utils/financial-math';

describe('InterestService', () => {
  let interestService: InterestService;
  const ANNUAL_RATE = 0.275; // 27.5%

  beforeEach(() => {
    interestService = new InterestService(ANNUAL_RATE);
  });

  describe('Daily Interest Calculation', () => {
    it('should calculate correct daily interest for a standard day in a non-leap year', () => {
      const principal = '100000';
      const date = new Date('2023-06-15'); // 2023 is not a leap year
      
      const result = interestService.calculateDailyInterest(principal, date);
      
      expect(result.principalAmount).toBe('100000.0000');
      expect(result.annualRate).toBe('0.275');
      expect(result.daysInYear).toBe(365);
      expect(result.isLeapYear).toBe(false);
      
      // Daily interest = 100,000 × 0.275 / 365 = 75.3424657534...
      expect(parseFloat(result.interestAmount)).toBeCloseTo(75.3425, 4);
    });

    it('should calculate correct daily interest for a leap year day', () => {
      const principal = '100000';
      const date = new Date('2024-02-29'); // 2024 is a leap year
      
      const result = interestService.calculateDailyInterest(principal, date);
      
      expect(result.daysInYear).toBe(366);
      expect(result.isLeapYear).toBe(true);
      
      // Daily interest = 100,000 × 0.275 / 366 = 75.1366120219...
      expect(parseFloat(result.interestAmount)).toBeCloseTo(75.1366, 4);
    });

    it('should handle very small principal amounts', () => {
      const principal = '100';
      const date = new Date('2023-01-01');
      
      const result = interestService.calculateDailyInterest(principal, date);
      
      // Daily interest = 100 × 0.275 / 365 = 0.0753424657...
      expect(parseFloat(result.interestAmount)).toBeCloseTo(0.0753, 4);
    });

    it('should handle very large principal amounts', () => {
      const principal = '10000000000'; // 10 billion
      const date = new Date('2023-01-01');
      
      const result = interestService.calculateDailyInterest(principal, date);
      
      // Daily interest = 10,000,000,000 × 0.275 / 365 = 7,534,246.5753...
      expect(parseFloat(result.interestAmount)).toBeCloseTo(7534246.5753, 2);
    });

    it('should calculate correct accrual date', () => {
      const date = new Date('2023-12-25');
      const result = interestService.calculateDailyInterest('100000', date);
      
      expect(result.accrualDate).toBe('2023-12-25');
    });
  });

  describe('Interest for Multiple Days', () => {
    it('should calculate correct interest for 30 days', () => {
      const principal = '100000';
      const days = 30;
      const startDate = new Date('2023-01-01');
      
      const result = interestService.calculateInterestForDays(principal, days, startDate);
      
      expect(result.dailyBreakdown.length).toBe(30);
      
      // Total interest for 30 days = 100,000 × 0.275 × 30 / 365 = 2,260.2739...
      expect(parseFloat(result.totalInterest)).toBeCloseTo(2260.2740, 2);
    });

    it('should handle year boundary crossing', () => {
      const principal = '100000';
      const days = 10;
      const startDate = new Date('2023-12-27'); // Crosses into 2024
      
      const result = interestService.calculateInterestForDays(principal, days, startDate);
      
      expect(result.dailyBreakdown.length).toBe(10);
      
      // Check first day (2023)
      expect(result.dailyBreakdown[0].accrualDate).toBe('2023-12-27');
      expect(result.dailyBreakdown[0].daysInYear).toBe(365);
      
      // Check last day (2024)
      expect(result.dailyBreakdown[9].accrualDate).toBe('2024-01-05');
      expect(result.dailyBreakdown[9].daysInYear).toBe(366);
    });

    it('should calculate interest correctly spanning a leap year boundary', () => {
      const principal = '100000';
      const days = 5;
      const startDate = new Date('2024-02-27'); // Before Feb 29
      
      const result = interestService.calculateInterestForDays(principal, days, startDate);
      
      // Should include Feb 29 (leap day)
      const leapDayResult = result.dailyBreakdown.find(d => d.accrualDate === '2024-02-29');
      expect(leapDayResult).toBeDefined();
      expect(leapDayResult?.isLeapYear).toBe(true);
    });
  });

  describe('Annual Interest Calculation', () => {
    it('should calculate correct annual interest for non-leap year', () => {
      const principal = '100000';
      const year = 2023;
      
      const annualInterest = interestService.calculateAnnualInterest(principal, year);
      
      // Annual interest = 100,000 × 0.275 = 27,500
      expect(parseFloat(annualInterest)).toBe(27500);
    });

    it('should calculate correct annual interest for leap year', () => {
      const principal = '100000';
      const year = 2024;
      
      const annualInterest = interestService.calculateAnnualInterest(principal, year);
      
      // Annual interest should still be 27,500 (same rate, just distributed over more days)
      expect(parseFloat(annualInterest)).toBe(27500);
    });
  });

  describe('Interest Simulation', () => {
    it('should simulate compound interest correctly over 30 days', () => {
      const principal = '100000';
      const days = 30;
      const startDate = new Date('2023-01-01');
      
      const result = interestService.simulateInterest(principal, days, startDate);
      
      expect(result.dailyBreakdown.length).toBe(30);
      
      // First day principal should be 100,000
      expect(result.dailyBreakdown[0].principal).toBe('100000.0000');
      
      // Balance should increase each day
      for (let i = 1; i < result.dailyBreakdown.length; i++) {
        expect(parseFloat(result.dailyBreakdown[i].balance))
          .toBeGreaterThan(parseFloat(result.dailyBreakdown[i - 1].balance));
      }
    });

    it('should calculate correct projected balance after 365 days', () => {
      const principal = '100000';
      const days = 365;
      const startDate = new Date('2023-01-01');
      
      const result = interestService.simulateInterest(principal, days, startDate);
      
      // With daily compounding at 27.5% annual rate
      // Final balance should be around 131,524 (compound interest effect)
      const finalBalance = parseFloat(result.projectedBalance);
      expect(finalBalance).toBeGreaterThan(127500); // More than simple interest
      expect(finalBalance).toBeLessThan(135000); // But reasonable
    });

    it('should handle simulation for single day', () => {
      const principal = '100000';
      const result = interestService.simulateInterest(principal, 1);
      
      expect(result.dailyBreakdown.length).toBe(1);
      expect(parseFloat(result.totalInterest)).toBeCloseTo(75.34, 2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero principal', () => {
      const result = interestService.calculateDailyInterest('0', new Date());
      expect(parseFloat(result.interestAmount)).toBe(0);
    });

    it('should handle very small fractional amounts', () => {
      const result = interestService.calculateDailyInterest('0.01', new Date('2023-01-01'));
      // Daily interest = 0.01 × 0.275 / 365 = 0.0000075342...
      // With 4 decimal place rounding, this rounds to 0.0000
      expect(parseFloat(result.interestAmount)).toBeGreaterThanOrEqual(0);
    });

    it('should handle decimal principal amounts correctly', () => {
      const principal = '12345.6789';
      const date = new Date('2023-01-01');
      
      const result = interestService.calculateDailyInterest(principal, date);
      
      // Verify calculation precision
      const expectedDaily = 12345.6789 * 0.275 / 365;
      expect(parseFloat(result.interestAmount)).toBeCloseTo(expectedDaily, 4);
    });

    it('should correctly handle February 28 in non-leap year', () => {
      const principal = '100000';
      const date = new Date('2023-02-28');
      
      const result = interestService.calculateDailyInterest(principal, date);
      
      expect(result.accrualDate).toBe('2023-02-28');
      expect(result.isLeapYear).toBe(false);
      expect(result.daysInYear).toBe(365);
    });

    it('should correctly handle February 29 in leap year', () => {
      const principal = '100000';
      const date = new Date('2024-02-29');
      
      const result = interestService.calculateDailyInterest(principal, date);
      
      expect(result.accrualDate).toBe('2024-02-29');
      expect(result.isLeapYear).toBe(true);
      expect(result.daysInYear).toBe(366);
    });

    it('should handle century leap year correctly (2000)', () => {
      const principal = '100000';
      const date = new Date('2000-02-29');
      
      const result = interestService.calculateDailyInterest(principal, date);
      
      expect(result.isLeapYear).toBe(true);
      expect(result.daysInYear).toBe(366);
    });

    it('should handle century non-leap year correctly (1900)', () => {
      const principal = '100000';
      const date = new Date('1900-03-01');
      
      const result = interestService.calculateDailyInterest(principal, date);
      
      expect(result.isLeapYear).toBe(false);
      expect(result.daysInYear).toBe(365);
    });
  });

  describe('Precision Verification', () => {
    it('should maintain precision through a full year of daily calculations', () => {
      const principal = '100000';
      let totalInterest = FinancialMath.decimal('0');
      const year = 2023;
      const daysInYear = 365;
      
      // Calculate daily interest for entire year
      const startDate = new Date(`${year}-01-01`);
      
      for (let i = 0; i < daysInYear; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        const result = interestService.calculateDailyInterest(principal, currentDate);
        totalInterest = totalInterest.plus(result.interestAmount);
      }
      
      // Should equal approximately 27,500 (within small rounding margin)
      const result = parseFloat(FinancialMath.round(totalInterest, 2));
      expect(result).toBeGreaterThanOrEqual(27499.99);
      expect(result).toBeLessThanOrEqual(27500.02);
    });

    it('should produce consistent results for same inputs', () => {
      const principal = '100000';
      const date = new Date('2023-06-15');
      
      const result1 = interestService.calculateDailyInterest(principal, date);
      const result2 = interestService.calculateDailyInterest(principal, date);
      
      expect(result1.interestAmount).toBe(result2.interestAmount);
      expect(result1.dailyRate).toBe(result2.dailyRate);
    });
  });

  describe('Custom Rate Configuration', () => {
    it('should use custom annual rate when provided', () => {
      const customRate = 0.10; // 10%
      const customService = new InterestService(customRate);
      
      const principal = '100000';
      const date = new Date('2023-01-01');
      
      const result = customService.calculateDailyInterest(principal, date);
      
      expect(result.annualRate).toBe('0.1');
      
      // Daily interest at 10% = 100,000 × 0.10 / 365 = 27.3972...
      expect(parseFloat(result.interestAmount)).toBeCloseTo(27.3973, 4);
    });
  });
});
