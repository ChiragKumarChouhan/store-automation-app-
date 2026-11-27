import { Router } from 'express';
import {
  createCustomer,
  deleteCustomer,
  getCustomerHistory,
  getCustomers,
  updateCustomer,
} from '../controllers/customerController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.get('/', getCustomers);
router.get('/:id/history', getCustomerHistory);
router.post('/', requireRole('admin'), createCustomer);
router.put('/:id', requireRole('admin'), updateCustomer);
router.delete('/:id', requireRole('admin'), deleteCustomer);

export default router;
