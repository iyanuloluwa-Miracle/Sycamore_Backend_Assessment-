import { Router } from 'express';
import { walletController } from '../controllers';
import { asyncHandler, validateUUID } from '../middleware';

const router = Router();

/**
 * Wallet Routes
 * 
 * POST   /              - Create new wallet
 * GET    /user/:userId  - Get wallet by user ID
 * GET    /:walletId     - Get wallet by ID
 * GET    /:walletId/balance - Get wallet balance
 * GET    /:walletId/history - Get wallet transaction history
 * GET    /:walletId/ledger  - Get wallet ledger entries
 */

router.post(
  '/',
  asyncHandler(walletController.createWallet.bind(walletController))
);

router.get(
  '/user/:userId',
  validateUUID('userId'),
  asyncHandler(walletController.getByUserId.bind(walletController))
);

router.get(
  '/:walletId',
  validateUUID('walletId'),
  asyncHandler(walletController.getWallet.bind(walletController))
);

router.get(
  '/:walletId/balance',
  validateUUID('walletId'),
  asyncHandler(walletController.getBalance.bind(walletController))
);

router.get(
  '/:walletId/history',
  validateUUID('walletId'),
  asyncHandler(walletController.getHistory.bind(walletController))
);

router.get(
  '/:walletId/ledger',
  validateUUID('walletId'),
  asyncHandler(walletController.getLedger.bind(walletController))
);

export default router;
