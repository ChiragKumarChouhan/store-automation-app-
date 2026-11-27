import { env } from '../config/env.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  // PostgreSQL error handling
  if (err.code === '23505') {
    statusCode = 409;
    if (err.constraint?.includes('sku')) {
      message = 'A product with this SKU already exists.';
    } else if (err.constraint?.includes('username')) {
      message = 'Username is already taken.';
    } else if (err.constraint?.includes('email')) {
      message = 'Email address is already registered.';
    } else if (err.constraint?.includes('categories_name')) {
      message = 'Category with this name already exists.';
    } else if (err.constraint?.includes('invoice_number')) {
      message = 'Invoice number conflict. Please retry.';
    } else {
      message = 'Duplicate record violates a unique constraint.';
    }
  } else if (err.code === '23503') {
    statusCode = 400;
    message = 'Referenced record does not exist or cannot be removed while in use.';
  } else if (err.code === '23514') {
    statusCode = 400;
    message = 'Value violates database validation constraints (e.g. negative stock or price).';
  } else if (err.code === '22P02') {
    statusCode = 400;
    message = 'Invalid input format.';
  }

  if (statusCode >= 500 && env.nodeEnv !== 'development') {
    console.error('Server Error:', err);
    message = 'An unexpected server error occurred.';
  } else if (statusCode >= 500) {
    console.error('Server Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
  });
}
