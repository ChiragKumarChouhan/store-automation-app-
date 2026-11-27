import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { AppError, asyncHandler } from '../utils/appError.js';

export const getUsers = asyncHandler(async (req, res) => {
  const { search = '', role = '', status = '' } = req.query;
  const conditions = [];
  const params = [];

  if (search && String(search).trim()) {
    params.push(`%${String(search).trim()}%`);
    conditions.push(
      `(username ILIKE $${params.length} OR full_name ILIKE $${params.length} OR COALESCE(email, '') ILIKE $${params.length})`
    );
  }
  if (role && ['admin', 'student'].includes(role)) {
    params.push(role);
    conditions.push(`role = $${params.length}`);
  }
  if (status === 'active') {
    conditions.push(`is_active = TRUE`);
  } else if (status === 'inactive') {
    conditions.push(`is_active = FALSE`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query(
    `SELECT id, username, full_name, email, role, is_active, last_login_at, created_at, updated_at
     FROM users
     ${whereClause}
     ORDER BY created_at DESC, id DESC`,
    params
  );

  res.json({ success: true, data: result.rows });
});

export const createUser = asyncHandler(async (req, res) => {
  const username = String(req.body.username ?? '').trim().toLowerCase();
  const fullName = String(req.body.full_name ?? '').trim();
  const email = String(req.body.email ?? '').trim();
  const password = String(req.body.password ?? '');
  const role = String(req.body.role ?? 'student').toLowerCase();
  const isActive = req.body.is_active !== undefined ? Boolean(req.body.is_active) : true;

  if (!username || username.length < 3) {
    throw new AppError('Username must be at least 3 characters.', 400);
  }
  if (!/^[a-z0-9._-]+$/.test(username)) {
    throw new AppError('Username may only contain letters, numbers, dots, underscores, or hyphens.', 400);
  }
  if (!fullName) {
    throw new AppError('Full name is required.', 400);
  }
  if (!password || password.length < 6) {
    throw new AppError('Password must be at least 6 characters long.', 400);
  }
  if (!['admin', 'student'].includes(role)) {
    throw new AppError('Role must be admin or student.', 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await query(
    `INSERT INTO users (username, full_name, email, password_hash, role, is_active)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, username, full_name, email, role, is_active, created_at`,
    [username, fullName, email || null, passwordHash, role, isActive]
  );

  res.status(201).json({
    success: true,
    message: 'User account created successfully.',
    data: result.rows[0],
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const targetId = Number(id);
  const username = String(req.body.username ?? '').trim().toLowerCase();
  const fullName = String(req.body.full_name ?? '').trim();
  const email = String(req.body.email ?? '').trim();
  const role = String(req.body.role ?? '').toLowerCase();
  const isActive = Boolean(req.body.is_active);

  if (!username || username.length < 3) {
    throw new AppError('Username must be at least 3 characters.', 400);
  }
  if (!fullName) {
    throw new AppError('Full name is required.', 400);
  }
  if (!['admin', 'student'].includes(role)) {
    throw new AppError('Role must be admin or student.', 400);
  }

  if (targetId === req.user.id && !isActive) {
    throw new AppError('You cannot deactivate your own active administrator account.', 400);
  }
  if (targetId === req.user.id && role !== 'admin') {
    throw new AppError('You cannot demote your own administrator role.', 400);
  }

  const result = await query(
    `UPDATE users
     SET username = $1, full_name = $2, email = $3, role = $4, is_active = $5, updated_at = NOW()
     WHERE id = $6
     RETURNING id, username, full_name, email, role, is_active, last_login_at, created_at, updated_at`,
    [username, fullName, email || null, role, isActive, targetId]
  );

  if (result.rowCount === 0) {
    throw new AppError('User not found.', 404);
  }

  res.json({
    success: true,
    message: 'User details updated successfully.',
    data: result.rows[0],
  });
});

export const toggleUserStatus = asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.user.id) {
    throw new AppError('You cannot deactivate your own account.', 400);
  }

  const result = await query(
    `UPDATE users
     SET is_active = NOT is_active, updated_at = NOW()
     WHERE id = $1
     RETURNING id, username, full_name, email, role, is_active`,
    [targetId]
  );

  if (result.rowCount === 0) {
    throw new AppError('User not found.', 404);
  }

  res.json({
    success: true,
    message: `Account ${result.rows[0].is_active ? 'activated' : 'deactivated'} successfully.`,
    data: result.rows[0],
  });
});

export const resetUserPassword = asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id);
  const { newPassword } = req.body;

  if (!newPassword || String(newPassword).length < 6) {
    throw new AppError('New password must be at least 6 characters long.', 400);
  }

  const passwordHash = await bcrypt.hash(String(newPassword), 10);
  const result = await query(
    `UPDATE users
     SET password_hash = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, username`,
    [passwordHash, targetId]
  );

  if (result.rowCount === 0) {
    throw new AppError('User not found.', 404);
  }

  res.json({
    success: true,
    message: `Password reset for "${result.rows[0].username}".`,
  });
});
