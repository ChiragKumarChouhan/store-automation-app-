import { Router } from 'express';
import {
  createSupplier,
  deleteSupplier,
  getSupplierById,
  getSuppliers,
  updateSupplier,
} from '../controllers/supplierController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.get('/', getSuppliers);
router.get('/:id', getSupplierById);
router.post('/', requireRole('admin'), createSupplier);
router.put('/:id', requireRole('admin'), updateSupplier);
router.delete('/:id', requireRole('admin'), deleteSupplier);

export default router;
