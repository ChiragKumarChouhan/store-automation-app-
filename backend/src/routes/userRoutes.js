import { Router } from 'express';
import {
  createUser,
  getUsers,
  resetUserPassword,
  toggleUserStatus,
  updateUser,
} from '../controllers/userController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRole('admin'));
router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/toggle-status', toggleUserStatus);
router.put('/:id/reset-password', resetUserPassword);

export default router;
