import { Router } from 'express';
import {
  adjustStock,
  getInventorySummary,
  getStockMovements,
} from '../controllers/inventoryController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.get('/summary', getInventorySummary);
router.get('/movements', getStockMovements);
router.post('/:productId/adjust', requireRole('admin'), adjustStock);

export default router;
