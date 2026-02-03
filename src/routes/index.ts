import { Router } from 'express';
import transferRoutes from './transfer.routes';
import walletRoutes from './wallet.routes';
import interestRoutes from './interest.routes';

const router = Router();

// Mount routes
router.use('/transfer', transferRoutes);
router.use('/wallets', walletRoutes);
router.use('/interest', interestRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Sycamore Backend API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
