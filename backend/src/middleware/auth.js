import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../config/db.js';
import { AppError, asyncHandler } from '../utils/appError.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.sa_token;

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7);
  }

  if (!token) {
    throw new AppError('Authentication required. Please log in.', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError('Session expired or invalid. Please log in again.', 401);
  }

  const result = await query(
    `SELECT id, username, full_name, email, role, is_active, last_login_at, created_at
     FROM users
     WHERE id = $1`,
    [decoded.userId]
  );

  if (result.rowCount === 0) {
    throw new AppError('Account no longer exists.', 401);
  }

  const user = result.rows[0];
  if (!user.is_active) {
    throw new AppError('Your account has been deactivated. Contact an administrator.', 403);
  }

  req.user = user;
  next();
});

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError('Access denied. You do not have permission for this action.', 403)
      );
    }
    return next();
  };
}

export const requireSalesPermission = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new AppError('Authentication required.', 401);
  }
  if (req.user.role === 'admin') {
    return next();
  }
  const settingsRes = await query(
    'SELECT student_can_create_sales FROM store_settings WHERE id = 1'
  );
  const allowed = settingsRes.rows[0]?.student_can_create_sales ?? false;
  if (!allowed) {
    throw new AppError(
      'Student sales creation is currently disabled in Store Settings.',
      403
    );
  }
  next();
});
