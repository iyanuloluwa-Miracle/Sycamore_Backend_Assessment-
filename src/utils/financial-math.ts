import Decimal from 'decimal.js';

/**
 * Utility class for precise financial calculations
 * Uses Decimal.js to avoid floating-point errors
 */
export class FinancialMath {
  // Configure Decimal.js for financial calculations
  static {
    Decimal.set({
      precision: 20,          // High precision for intermediate calculations
      rounding: Decimal.ROUND_HALF_UP,  // Standard financial rounding
      toExpNeg: -9,
      toExpPos: 20,
    });
  }

  /**
   * Check if a year is a leap year
   * @param year - The year to check
   */
  static isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  /**
   * Get the number of days in a year
   * @param year - The year to check
   */
  static getDaysInYear(year: number): number {
    return this.isLeapYear(year) ? 366 : 365;
  }

  /**
   * Calculate daily interest rate from annual rate
   * @param annualRate - Annual interest rate (e.g., 0.275 for 27.5%)
   * @param daysInYear - Number of days in the year (365 or 366)
   */
  static calculateDailyRate(annualRate: number | string, daysInYear: number): Decimal {
    const annual = new Decimal(annualRate);
    const days = new Decimal(daysInYear);
    return annual.dividedBy(days);
  }

  /**
   * Calculate daily interest amount
   * @param principal - Principal amount
   * @param annualRate - Annual interest rate (e.g., 0.275 for 27.5%)
   * @param daysInYear - Number of days in the year (365 or 366)
   */
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
   * Calculate interest for a specific number of days
   * @param principal - Principal amount
   * @param annualRate - Annual interest rate (e.g., 0.275 for 27.5%)
   * @param days - Number of days
   * @param daysInYear - Number of days in the year (365 or 366)
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

    // Interest = Principal × (Annual Rate × Days / Days in Year)
    return principalDecimal.times(annual).times(daysDecimal).dividedBy(daysInYearDecimal);
  }

  /**
   * Add two amounts with precision
   * @param a - First amount
   * @param b - Second amount
   */
  static add(a: number | string, b: number | string): Decimal {
    return new Decimal(a).plus(new Decimal(b));
  }

  /**
   * Subtract two amounts with precision
   * @param a - First amount (minuend)
   * @param b - Second amount (subtrahend)
   */
  static subtract(a: number | string, b: number | string): Decimal {
    return new Decimal(a).minus(new Decimal(b));
  }

  /**
   * Multiply two amounts with precision
   * @param a - First amount
   * @param b - Second amount
   */
  static multiply(a: number | string, b: number | string): Decimal {
    return new Decimal(a).times(new Decimal(b));
  }

  /**
   * Divide two amounts with precision
   * @param a - Dividend
   * @param b - Divisor
   */
  static divide(a: number | string, b: number | string): Decimal {
    return new Decimal(a).dividedBy(new Decimal(b));
  }

  /**
   * Round to specified decimal places (default 4 for currency)
   * @param value - Value to round
   * @param decimalPlaces - Number of decimal places
   */
  static round(value: number | string | Decimal, decimalPlaces: number = 4): string {
    const decimal = value instanceof Decimal ? value : new Decimal(value);
    return decimal.toFixed(decimalPlaces);
  }

  /**
   * Check if amount is greater than another
   * @param a - First amount
   * @param b - Second amount
   */
  static isGreaterThan(a: number | string, b: number | string): boolean {
    return new Decimal(a).greaterThan(new Decimal(b));
  }

  /**
   * Check if amount is greater than or equal to another
   * @param a - First amount
   * @param b - Second amount
   */
  static isGreaterThanOrEqual(a: number | string, b: number | string): boolean {
    return new Decimal(a).greaterThanOrEqualTo(new Decimal(b));
  }

  /**
   * Check if amount is less than another
   * @param a - First amount
   * @param b - Second amount
   */
  static isLessThan(a: number | string, b: number | string): boolean {
    return new Decimal(a).lessThan(new Decimal(b));
  }

  /**
   * Check if amount is zero
   * @param value - Value to check
   */
  static isZero(value: number | string): boolean {
    return new Decimal(value).isZero();
  }

  /**
   * Check if amount is negative
   * @param value - Value to check
   */
  static isNegative(value: number | string): boolean {
    return new Decimal(value).isNegative();
  }

  /**
   * Check if amount is positive
   * @param value - Value to check
   */
  static isPositive(value: number | string): boolean {
    return new Decimal(value).isPositive() && !new Decimal(value).isZero();
  }

  /**
   * Convert to string with fixed decimal places
   * @param value - Value to format
   * @param decimalPlaces - Number of decimal places
   */
  static toFixed(value: number | string | Decimal, decimalPlaces: number = 4): string {
    const decimal = value instanceof Decimal ? value : new Decimal(value);
    return decimal.toFixed(decimalPlaces);
  }

  /**
   * Create a new Decimal instance
   * @param value - Value to convert
   */
  static decimal(value: number | string): Decimal {
    return new Decimal(value);
  }
}

export default FinancialMath;
