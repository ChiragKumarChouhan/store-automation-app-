import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { query } from "../config/db.js";
import { AppError, asyncHandler } from "../utils/appError.js";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: env.nodeEnv === "production" ? "none" : "lax",
  secure: env.nodeEnv === "production",
  maxAge: 24 * 60 * 60 * 1000,
  path: "/",
};

async function getStoreConfigSummary() {
  const res = await query(
    `SELECT store_name, institution_name, address, phone, email,
            currency_symbol, default_tax_rate, invoice_prefix, student_can_create_sales
     FROM store_settings WHERE id = 1`,
  );

  return (
    res.rows[0] || {
      store_name: "Store Automation",
      institution_name: "ABESEC Ghaziabad",
      currency_symbol: "₹",
      default_tax_rate: 0,
      invoice_prefix: "INV",
      student_can_create_sales: true,
    }
  );
}

export const login = asyncHandler(async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !String(username).trim()) {
    throw new AppError("Username is required.", 400);
  }

  if (!password) {
    throw new AppError("Password is required.", 400);
  }

  const normalizedUsername = String(username).trim().toLowerCase();

  const result = await query(
    `SELECT id, username, full_name, email, password_hash, role, is_active, created_at
     FROM users
     WHERE LOWER(username) = $1`,
    [normalizedUsername],
  );

  if (result.rowCount === 0) {
    throw new AppError("Invalid username or password.", 401);
  }

  const user = result.rows[0];

  if (!user.is_active) {
    throw new AppError(
      "This account is deactivated. Please contact an administrator.",
      403,
    );
  }

  const isPasswordValid = await bcrypt.compare(
    String(password),
    user.password_hash,
  );

  if (!isPasswordValid) {
    throw new AppError("Invalid username or password.", 401);
  }

  if (role) {
    const requestedRole = String(role).toLowerCase();

    if (!["admin", "student"].includes(requestedRole)) {
      throw new AppError("Invalid role selected.", 400);
    }

    if (user.role !== requestedRole) {
      throw new AppError(
        `This account is registered as "${user.role === "admin" ? "Admin" : "Student"}". Please select the matching login role.`,
        403,
      );
    }
  }

  await query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [
    user.id,
  ]);

  const token = jwt.sign({ userId: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

  res.cookie("sa_token", token, COOKIE_OPTIONS);

  const storeSettings = await getStoreConfigSummary();

  res.json({
    success: true,
    message: "Login successful.",
    data: {
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
      },
      storeSettings,
    },
  });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("sa_token", {
    ...COOKIE_OPTIONS,
    maxAge: undefined,
  });

  res.json({
    success: true,
    message: "Logged out successfully.",
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const storeSettings = await getStoreConfigSummary();

  res.json({
    success: true,
    data: {
      user: req.user,
      storeSettings,
    },
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError("Current password and new password are required.", 400);
  }

  if (String(newPassword).length < 6) {
    throw new AppError("New password must be at least 6 characters long.", 400);
  }

  const userRes = await query(
    "SELECT id, password_hash FROM users WHERE id = $1",
    [req.user.id],
  );

  const user = userRes.rows[0];

  const valid = await bcrypt.compare(
    String(currentPassword),
    user.password_hash,
  );

  if (!valid) {
    throw new AppError("Current password is incorrect.", 400);
  }

  const newHash = await bcrypt.hash(String(newPassword), 10);

  await query(
    "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
    [newHash, req.user.id],
  );

  res.json({
    success: true,
    message: "Password updated successfully.",
  });
});
