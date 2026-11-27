import { query } from '../config/db.js';
import { AppError, asyncHandler } from '../utils/appError.js';

export const getSettings = asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM store_settings WHERE id = 1');
  res.json({
    success: true,
    data: result.rows[0] || {},
  });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const storeName = String(req.body.store_name ?? '').trim();
  const institutionName = String(req.body.institution_name ?? '').trim();
  const address = String(req.body.address ?? '').trim();
  const phone = String(req.body.phone ?? '').trim();
  const email = String(req.body.email ?? '').trim();
  const currencySymbol = String(req.body.currency_symbol ?? '₹').trim();
  const defaultTaxRate = Number(req.body.default_tax_rate ?? 0);
  const invoicePrefix = String(req.body.invoice_prefix ?? 'INV').trim().toUpperCase();
  const studentCanCreateSales = Boolean(req.body.student_can_create_sales);

  if (!storeName) throw new AppError('Store name is required.', 400);
  if (!institutionName) throw new AppError('Institution name is required.', 400);
  if (!invoicePrefix || !/^[A-Z0-9-]+$/.test(invoicePrefix)) {
    throw new AppError('Invoice prefix must contain only uppercase letters, numbers, or hyphens.', 400);
  }
  if (Number.isNaN(defaultTaxRate) || defaultTaxRate < 0 || defaultTaxRate > 100) {
    throw new AppError('Default tax rate must be between 0 and 100.', 400);
  }

  const result = await query(
    `UPDATE store_settings
     SET store_name = $1,
         institution_name = $2,
         address = $3,
         phone = $4,
         email = $5,
         currency_symbol = $6,
         default_tax_rate = $7,
         invoice_prefix = $8,
         student_can_create_sales = $9,
         updated_by = $10,
         updated_at = NOW()
     WHERE id = 1
     RETURNING *`,
    [
      storeName,
      institutionName,
      address,
      phone,
      email,
      currencySymbol || '₹',
      Number(defaultTaxRate.toFixed(2)),
      invoicePrefix,
      studentCanCreateSales,
      req.user.id,
    ]
  );

  res.json({
    success: true,
    message: 'Application settings updated successfully.',
    data: result.rows[0],
  });
});

export const getNotifications = asyncHandler(async (req, res) => {
  const alertsRes = await query(`
    SELECT
      p.id,
      p.sku,
      p.name,
      i.available_quantity,
      i.min_stock_level,
      CASE
        WHEN i.available_quantity = 0 THEN 'out_of_stock'
        ELSE 'low_stock'
      END AS severity
    FROM products p
    JOIN inventory i ON i.product_id = p.id
    WHERE i.available_quantity <= i.min_stock_level
    ORDER BY i.available_quantity ASC, p.name ASC
    LIMIT 15
  `);

  res.json({
    success: true,
    data: {
      count: alertsRes.rowCount,
      alerts: alertsRes.rows,
    },
  });
});
