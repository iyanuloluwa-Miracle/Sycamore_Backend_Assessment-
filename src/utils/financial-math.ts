import Decimal from 'decimal.js';

/**
 * Decimal.js wrapper for money calculations.
 * 
 * JavaScript's native numbers can't reliably represent currency
 * (try 0.1 + 0.2 in a console). This class ensures we never lose
 * precision in intermediate calculations and always round correctly
 * when storing or displaying values.
 */
export class FinancialMath {
  static {
    Decimal.set({
      precision: 20,
      rounding: Decimal.ROUND_HALF_UP,
      toExpNeg: -9,
      toExpPos: 20,
    });
  }

  static isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  static getDaysInYear(year: number): number {
    return this.isLeapYear(year) ? 366 : 365;
  }

  /**
   * Daily rate = annual rate / days in year.
   * Leap years use 366 days, which matters for precise interest calculations.
   */
  static calculateDailyRate(annualRate: number | string, daysInYear: number): Decimal {
    const annual = new Decimal(annualRate);
    const days = new Decimal(daysInYear);
    return annual.dividedBy(days);
  }

  static calculateDailyInterest(
    principal: number | string,
    annualRate: number | string,
    daysInYear: number
  ): Decimal {
    const principalDecimal = new Decimal(principal);
    const dailyRate = this.calculateDailyRate(annualRate, daysInYear);
    return principalDecimal.times(dailyRate);
  }

  /**
   * Simple interest over N days: P × R × D / Y
   */
  static calculateInterestForDays(
    principal: number | string,
    annualRate: number | string,
    days: number,
    daysInYear: number
  ): Decimal {
    const principalDecimal = new Decimal(principal);
    const annual = new Decimal(annualRate);
    const daysDecimal = new Decimal(days);
    const daysInYearDecimal = new Decimal(daysInYear);

    return principalDecimal.times(annual).times(daysDecimal).dividedBy(daysInYearDecimal);
  }

  static add(a: number | string, b: number | string): Decimal {
    return new Decimal(a).plus(new Decimal(b));
  }

  static subtract(a: number | string, b: number | string): Decimal {
    return new Decimal(a).minus(new Decimal(b));
  }

  static multiply(a: number | string, b: number | string): Decimal {
    return new Decimal(a).times(new Decimal(b));
  }

  static divide(a: number | string, b: number | string): Decimal {
    return new Decimal(a).dividedBy(new Decimal(b));
  }

  /**
   * Round to N decimal places. Default is 4, which is standard for
   * storing currency with sub-cent precision (e.g., for interest accruals).
   */
  static round(value: number | string | Decimal, decimalPlaces: number = 4): string {
    const decimal = value instanceof Decimal ? value : new Decimal(value);
    return decimal.toFixed(decimalPlaces);
  }

  static isGreaterThan(a: number | string, b: number | string): boolean {
    return new Decimal(a).greaterThan(new Decimal(b));
  }

  static isGreaterThanOrEqual(a: number | string, b: number | string): boolean {
    return new Decimal(a).greaterThanOrEqualTo(new Decimal(b));
  }

  static isLessThan(a: number | string, b: number | string): boolean {
    return new Decimal(a).lessThan(new Decimal(b));
  }

  static isZero(value: number | string): boolean {
    return new Decimal(value).isZero();
  }

  static isNegative(value: number | string): boolean {
    return new Decimal(value).isNegative();
  }

  static isPositive(value: number | string): boolean {
    return new Decimal(value).isPositive() && !new Decimal(value).isZero();
  }

  static toFixed(value: number | string | Decimal, decimalPlaces: number = 4): string {
    const decimal = value instanceof Decimal ? value : new Decimal(value);
    return decimal.toFixed(decimalPlaces);
  }

  static decimal(value: number | string): Decimal {
    return new Decimal(value);
  }
}

export default FinancialMath;
