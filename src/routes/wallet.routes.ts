import { Router } from 'express';
import { walletController } from '../controllers';
import { asyncHandler, validateUUID } from '../middleware';

const router = Router();

/**
 * @swagger
 * /wallet:
 *   post:
 *     summary: Create a new wallet
 *     description: Creates a wallet for a user. Each user should have exactly one wallet.
 *     tags: [Wallets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               initialBalance:
 *                 type: string
 *                 description: Starting balance (defaults to 0)
 *                 example: "1000.00"
 *     responses:
 *       201:
 *         description: Wallet created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Wallet'
 *       409:
 *         description: Wallet already exists for this user
 */
router.post(
  '/',
  asyncHandler(walletController.createWallet.bind(walletController))
);

/**
 * @swagger
 * /wallet/user/{userId}:
 *   get:
 *     summary: Get wallet by user ID
 *     description: Look up a user's wallet by their user ID.
 *     tags: [Wallets]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Wallet found
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Wallet'
 *       404:
 *         description: No wallet exists for this user
 */
router.get(
  '/user/:userId',
  validateUUID('userId'),
  asyncHandler(walletController.getByUserId.bind(walletController))
);

/**
 * @swagger
 * /wallet/{walletId}:
 *   get:
 *     summary: Get wallet details
 *     description: Retrieve wallet information by wallet ID.
 *     tags: [Wallets]
 *     parameters:
 *       - $ref: '#/components/parameters/WalletId'
 *     responses:
 *       200:
 *         description: Wallet details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Wallet'
 *       404:
 *         description: Wallet not found
 */
router.get(
  '/:walletId',
  validateUUID('walletId'),
  asyncHandler(walletController.getWallet.bind(walletController))
);

/**
 * @swagger
 * /wallet/{walletId}/balance:
 *   get:
 *     summary: Get wallet balance
 *     description: Returns only the current balance for a wallet.
 *     tags: [Wallets]
 *     parameters:
 *       - $ref: '#/components/parameters/WalletId'
 *     responses:
 *       200:
 *         description: Current balance
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
 *                     balance:
 *                       type: string
 *                       example: "10500.0000"
 *       404:
 *         description: Wallet not found
 */
router.get(
  '/:walletId/balance',
  validateUUID('walletId'),
  asyncHandler(walletController.getBalance.bind(walletController))
);

/**
 * @swagger
 * /wallet/{walletId}/history:
 *   get:
 *     summary: Get transaction history
 *     description: Returns paginated list of transactions involving this wallet.
 *     tags: [Wallets]
 *     parameters:
 *       - $ref: '#/components/parameters/WalletId'
 *       - $ref: '#/components/parameters/Limit'
 *       - $ref: '#/components/parameters/Offset'
 *     responses:
 *       200:
 *         description: Transaction history
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
 *                         $ref: '#/components/schemas/TransactionLog'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       404:
 *         description: Wallet not found
 */
router.get(
  '/:walletId/history',
  validateUUID('walletId'),
  asyncHandler(walletController.getHistory.bind(walletController))
);

/**
 * @swagger
 * /wallet/{walletId}/ledger:
 *   get:
 *     summary: Get ledger entries
 *     description: |
 *       Returns the double-entry ledger records for this wallet.
 *       Every transfer creates two ledger entries: a DEBIT on the source wallet and a CREDIT on the destination.
 *     tags: [Wallets]
 *     parameters:
 *       - $ref: '#/components/parameters/WalletId'
 *       - $ref: '#/components/parameters/Limit'
 *       - $ref: '#/components/parameters/Offset'
 *     responses:
 *       200:
 *         description: Ledger entries
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
 *                         $ref: '#/components/schemas/LedgerEntry'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       404:
 *         description: Wallet not found
 */
router.get(
  '/:walletId/ledger',
  validateUUID('walletId'),
  asyncHandler(walletController.getLedger.bind(walletController))
);

export default router;
