import { Request, Response } from 'express';
import { interestService } from '../services';
import { InterestAccrual } from '../models';

/**
 * HTTP handlers for interest calculations and accruals.
 */
export class InterestController {

  async calculateDaily(req: Request, res: Response): Promise<void> {
    const { principal, date } = req.body;

    if (!principal || isNaN(Number(principal)) || Number(principal) <= 0) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Valid positive principal amount is required',
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    const calculationDate = date ? new Date(date) : new Date();

    if (isNaN(calculationDate.getTime())) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid date format',
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    const result = interestService.calculateDailyInterest(principal.toString(), calculationDate);

    res.json({
      success: true,
      data: result,
    });
  }

  async calculatePeriod(req: Request, res: Response): Promise<void> {
    const { principal, days, startDate } = req.body;

    if (!principal || isNaN(Number(principal)) || Number(principal) <= 0) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Valid positive principal amount is required',
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    if (!days || isNaN(Number(days)) || Number(days) <= 0 || Number(days) > 365) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Days must be a positive number up to 365',
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    const start = startDate ? new Date(startDate) : new Date();

    if (isNaN(start.getTime())) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid startDate format',
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    const result = interestService.calculateInterestForDays(
      principal.toString(),
      Number(days),
      start
    );

    res.json({
      success: true,
      data: result,
    });
  }

  async simulate(req: Request, res: Response): Promise<void> {
    const { principal, days, startDate } = req.body;

    if (!principal || isNaN(Number(principal)) || Number(principal) <= 0) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Valid positive principal amount is required',
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    if (!days || isNaN(Number(days)) || Number(days) <= 0 || Number(days) > 365) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Days must be a positive number up to 365',
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    const start = startDate ? new Date(startDate) : new Date();

    if (isNaN(start.getTime())) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid startDate format',
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    const result = interestService.simulateInterest(
      principal.toString(),
      Number(days),
      start
    );

    res.json({
      success: true,
      data: result,
    });
  }

  async accrueForWallet(req: Request, res: Response): Promise<void> {
    const { walletId } = req.params;
    const { date } = req.body;

    const accrualDate = date ? new Date(date) : new Date();

    if (isNaN(accrualDate.getTime())) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid date format',
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    const result = await interestService.accrueInterestForWallet(walletId, accrualDate);

    if (!result) {
      res.status(404).json({
        success: false,
        error: {
          message: 'Wallet not found or has zero/negative balance',
          code: 'NOT_FOUND',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: result,
    });
  }

  async accrueForAll(req: Request, res: Response): Promise<void> {
    const { date } = req.body;

    const accrualDate = date ? new Date(date) : new Date();

    if (isNaN(accrualDate.getTime())) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid date format',
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    const results = await interestService.accrueInterestForAllWallets(accrualDate);

    res.json({
      success: true,
      data: {
        accruals: results,
        count: results.length,
        date: accrualDate.toISOString().split('T')[0],
      },
    });
  }

  async applyInterest(req: Request, res: Response): Promise<void> {
    const { walletId, date } = req.body;

    const applyDate = date ? new Date(date) : undefined;

    if (date && isNaN(applyDate!.getTime())) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid date format',
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    const result = await interestService.applyAccruedInterest(walletId, applyDate);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: {
          message: result.message,
          details: result.error,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: result,
    });
  }

  async getHistory(req: Request, res: Response): Promise<void> {
    const { walletId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const history = await interestService.getInterestHistory(walletId, limit, offset);
    const total = await InterestAccrual.count({ where: { walletId } });

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + history.length < total,
        },
      },
    });
  }

  async getTotalInterest(req: Request, res: Response): Promise<void> {
    const { walletId } = req.params;
    const applied = req.query.applied !== undefined
      ? req.query.applied === 'true'
      : undefined;

    const totalInterest = await interestService.getTotalAccruedInterest(walletId, applied);

    res.json({
      success: true,
      data: {
        walletId,
        totalInterest,
        appliedFilter: applied,
      },
    });
  }

  async getAnnualProjection(req: Request, res: Response): Promise<void> {
    const { principal, year } = req.query;

    if (!principal || isNaN(Number(principal)) || Number(principal) <= 0) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Valid positive principal amount is required',
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    const projectionYear = year ? parseInt(year as string) : new Date().getFullYear();

    const annualInterest = interestService.calculateAnnualInterest(
      principal as string,
      projectionYear
    );

    res.json({
      success: true,
      data: {
        principal,
        year: projectionYear,
        annualRate: '27.5%',
        projectedInterest: annualInterest,
        projectedTotal: (parseFloat(principal as string) + parseFloat(annualInterest)).toFixed(4),
      },
    });
  }
}

export const interestController = new InterestController();
export default interestController;
