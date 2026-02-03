import { Router } from 'express';
import { interestController } from '../controllers';
import { asyncHandler, validateUUID } from '../middleware';

const router = Router();

/**
 * Interest Routes
 * 
 * POST   /calculate        - Calculate daily interest (preview)
 * POST   /calculate-period - Calculate interest for period
 * POST   /simulate         - Simulate compound interest
 * POST   /accrue/:walletId - Accrue interest for wallet
 * POST   /accrue-all       - Accrue interest for all wallets
 * POST   /apply            - Apply accrued interest to balance
 * GET    /history/:walletId - Get interest accrual history
 * GET    /total/:walletId   - Get total accrued interest
 * GET    /annual-projection - Get annual interest projection
 */

router.post(
  '/calculate',
  asyncHandler(interestController.calculateDaily.bind(interestController))
);

router.post(
  '/calculate-period',
  asyncHandler(interestController.calculatePeriod.bind(interestController))
);

router.post(
  '/simulate',
  asyncHandler(interestController.simulate.bind(interestController))
);

router.post(
  '/accrue/:walletId',
  validateUUID('walletId'),
  asyncHandler(interestController.accrueForWallet.bind(interestController))
);

router.post(
  '/accrue-all',
  asyncHandler(interestController.accrueForAll.bind(interestController))
);

router.post(
  '/apply',
  asyncHandler(interestController.applyInterest.bind(interestController))
);

router.get(
  '/history/:walletId',
  validateUUID('walletId'),
  asyncHandler(interestController.getHistory.bind(interestController))
);

router.get(
  '/total/:walletId',
  validateUUID('walletId'),
  asyncHandler(interestController.getTotalInterest.bind(interestController))
);

router.get(
  '/annual-projection',
  asyncHandler(interestController.getAnnualProjection.bind(interestController))
);

export default router;
