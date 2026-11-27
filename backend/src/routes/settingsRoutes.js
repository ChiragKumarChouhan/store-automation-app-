import { Router } from 'express';
import {
  getNotifications,
  getSettings,
  updateSettings,
} from '../controllers/settingsController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.get('/', getSettings);
router.put('/', requireRole('admin'), updateSettings);
router.get('/notifications', getNotifications);

export default router;
