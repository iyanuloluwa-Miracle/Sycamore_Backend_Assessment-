import { Router } from 'express';
import { interestController } from '../controllers';
import { asyncHandler, validateUUID } from '../middleware';

const router = Router();

/**
 * @swagger
 * /interest/calculate:
 *   post:
 *     summary: Calculate daily interest (preview)
 *     description: |
 *       Returns the interest that would accrue on a principal amount for a single day.
 *       This is a preview only—no interest is actually accrued.
 *       
 *       Rate: 27.5% per annum, prorated daily (accounts for leap years).
 *     tags: [Interest]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [principal]
 *             properties:
 *               principal:
 *                 type: string
 *                 description: Amount to calculate interest on
 *                 example: "10000.00"
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date for calculation (affects leap year handling)
 *     responses:
 *       200:
 *         description: Daily interest calculation
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/InterestCalculation'
 */
router.post(
  '/calculate',
  asyncHandler(interestController.calculateDaily.bind(interestController))
);

/**
 * @swagger
 * /interest/calculate-period:
 *   post:
 *     summary: Calculate interest for a date range
 *     description: Calculates simple interest across a period, handling leap year boundaries correctly.
 *     tags: [Interest]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [principal, startDate, endDate]
 *             properties:
 *               principal:
 *                 type: string
 *                 example: "10000.00"
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Period interest calculation
 */
router.post(
  '/calculate-period',
  asyncHandler(interestController.calculatePeriod.bind(interestController))
);

/**
 * @swagger
 * /interest/simulate:
 *   post:
 *     summary: Simulate compound interest
 *     description: |
 *       Projects how a balance would grow over time with daily compounding.
 *       Useful for showing users potential earnings.
 *     tags: [Interest]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [principal, days]
 *             properties:
 *               principal:
 *                 type: string
 *                 example: "10000.00"
 *               days:
 *                 type: integer
 *                 description: Number of days to simulate
 *                 example: 365
 *     responses:
 *       200:
 *         description: Simulation results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     principal:
 *                       type: string
 *                     finalBalance:
 *                       type: string
 *                     totalInterest:
 *                       type: string
 *                     effectiveRate:
 *                       type: string
 *                       description: Actual rate achieved with compounding
 */
router.post(
  '/simulate',
  asyncHandler(interestController.simulate.bind(interestController))
);

/**
 * @swagger
 * /interest/accrue/{walletId}:
 *   post:
 *     summary: Accrue daily interest for a wallet
 *     description: |
 *       Records today's interest accrual for a specific wallet.
 *       Interest is tracked but not yet added to the balance.
 *       Idempotent: calling multiple times on the same day has no additional effect.
 *     tags: [Interest]
 *     parameters:
 *       - $ref: '#/components/parameters/WalletId'
 *     responses:
 *       200:
 *         description: Interest accrued (or already accrued today)
 *       404:
 *         description: Wallet not found
 */
router.post(
  '/accrue/:walletId',
  validateUUID('walletId'),
  asyncHandler(interestController.accrueForWallet.bind(interestController))
);

/**
 * @swagger
 * /interest/accrue-all:
 *   post:
 *     summary: Accrue interest for all wallets
 *     description: |
 *       Batch operation to accrue today's interest for every wallet in the system.
 *       Typically run once daily via cron job.
 *     tags: [Interest]
 *     responses:
 *       200:
 *         description: Batch accrual complete
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     processed:
 *                       type: integer
 *                     totalAccrued:
 *                       type: string
 */
router.post(
  '/accrue-all',
  asyncHandler(interestController.accrueForAll.bind(interestController))
);

/**
 * @swagger
 * /interest/apply:
 *   post:
 *     summary: Apply accrued interest to wallet balance
 *     description: |
 *       Moves accrued interest into the wallet's actual balance.
 *       Creates a ledger entry for the interest credit.
 *     tags: [Interest]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [walletId]
 *             properties:
 *               walletId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Interest applied to balance
 *       404:
 *         description: Wallet not found
 */
router.post(
  '/apply',
  asyncHandler(interestController.applyInterest.bind(interestController))
);

/**
 * @swagger
 * /interest/history/{walletId}:
 *   get:
 *     summary: Get interest accrual history
 *     description: Returns the record of daily interest accruals for a wallet.
 *     tags: [Interest]
 *     parameters:
 *       - $ref: '#/components/parameters/WalletId'
 *       - $ref: '#/components/parameters/Limit'
 *       - $ref: '#/components/parameters/Offset'
 *     responses:
 *       200:
 *         description: Interest history
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/InterestCalculation'
 *       404:
 *         description: Wallet not found
 */
router.get(
  '/history/:walletId',
  validateUUID('walletId'),
  asyncHandler(interestController.getHistory.bind(interestController))
);

/**
 * @swagger
 * /interest/total/{walletId}:
 *   get:
 *     summary: Get total accrued interest
 *     description: Returns the sum of all interest accrued for a wallet that hasn't been applied yet.
 *     tags: [Interest]
 *     parameters:
 *       - $ref: '#/components/parameters/WalletId'
 *     responses:
 *       200:
 *         description: Total accrued interest
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     walletId:
 *                       type: string
 *                       format: uuid
 *                     totalAccrued:
 *                       type: string
 *                       example: "125.4521"
 *       404:
 *         description: Wallet not found
 */
router.get(
  '/total/:walletId',
  validateUUID('walletId'),
  asyncHandler(interestController.getTotalInterest.bind(interestController))
);

/**
 * @swagger
 * /interest/annual-projection:
 *   get:
 *     summary: Get annual interest projection
 *     description: |
 *       Projects interest earnings for a wallet over the next year,
 *       accounting for compounding.
 *     tags: [Interest]
 *     parameters:
 *       - name: walletId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Annual projection
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentBalance:
 *                       type: string
 *                     projectedBalance:
 *                       type: string
 *                     projectedInterest:
 *                       type: string
 *                     effectiveAnnualRate:
 *                       type: string
 */
router.get(
  '/annual-projection',
  asyncHandler(interestController.getAnnualProjection.bind(interestController))
);

export default router;
