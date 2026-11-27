import { Router } from 'express';
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from '../controllers/categoryController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.get('/', getCategories);
router.post('/', requireRole('admin'), createCategory);
router.put('/:id', requireRole('admin'), updateCategory);
router.delete('/:id', requireRole('admin'), deleteCategory);

export default router;
