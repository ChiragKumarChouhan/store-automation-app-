import { Router } from 'express';
import {
  createSale,
  getSaleById,
  getSales,
} from '../controllers/salesController.js';
import { authenticate, requireSalesPermission } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.get('/', getSales);
router.get('/:id', getSaleById);
router.post('/', requireSalesPermission, createSale);

export default router;
