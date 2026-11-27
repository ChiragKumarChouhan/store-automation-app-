import { query } from '../config/db.js';
import { AppError, asyncHandler } from '../utils/appError.js';

export const getCustomers = asyncHandler(async (req, res) => {
  const { search = '', page = '1', limit = '15' } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
  const offset = (pageNum - 1) * limitNum;

  const params = [];
  let whereClause = '';
  if (search && String(search).trim()) {
    params.push(`%${String(search).trim()}%`);
    whereClause = `WHERE c.name ILIKE $1 OR c.phone ILIKE $1 OR COALESCE(c.email, '') ILIKE $1 OR c.customer_code ILIKE $1`;
  }

  const countRes = await query(
    `SELECT COUNT(*)::int AS total FROM customers c ${whereClause}`,
    params
  );
  const total = countRes.rows[0].total;

  const dataParams = [...params, limitNum, offset];
  const rowsRes = await query(
    `SELECT
       c.*,
       COUNT(s.id)::int AS total_orders,
       COALESCE(SUM(CASE WHEN s.status = 'completed' THEN s.total_amount ELSE 0 END), 0)::float8 AS total_spent,
       MAX(s.sale_date) AS last_purchase_date
     FROM customers c
     LEFT JOIN sales s ON s.customer_id = c.id
     ${whereClause}
     GROUP BY c.id
     ORDER BY c.created_at DESC, c.id DESC
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  res.json({
    success: true,
    data: {
      items: rowsRes.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
      },
    },
  });
});

export const getCustomerHistory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const custRes = await query('SELECT * FROM customers WHERE id = $1', [id]);
  if (custRes.rowCount === 0) {
    throw new AppError('Customer not found.', 404);
  }

  const salesRes = await query(
    `SELECT
       s.id, s.invoice_number, s.subtotal::float8 AS subtotal,
       s.discount_amount::float8 AS discount_amount,
       s.total_amount::float8 AS total_amount,
       s.payment_method, s.status, s.sale_date,
       (SELECT COALESCE(SUM(si.quantity), 0)::int FROM sale_items si WHERE si.sale_id = s.id) AS item_count
     FROM sales s
     WHERE s.customer_id = $1
     ORDER BY s.sale_date DESC`,
    [id]
  );

  res.json({
    success: true,
    data: {
      customer: custRes.rows[0],
      purchases: salesRes.rows,
    },
  });
});

export const createCustomer = asyncHandler(async (req, res) => {
  const name = String(req.body.name ?? '').trim();
  const phone = String(req.body.phone ?? '').trim();
  const email = String(req.body.email ?? '').trim();
  const address = String(req.body.address ?? '').trim();
  const registrationDate = req.body.registration_date || null;

  if (!name) throw new AppError('Customer name is required.', 400);
  if (!phone) throw new AppError('Phone number is required.', 400);

  const seqRes = await query('SELECT COALESCE(MAX(id), 0) + 1001 AS next_num FROM customers');
  const customerCode = `CUST-${seqRes.rows[0].next_num}`;

  const result = await query(
    `INSERT INTO customers (customer_code, name, phone, email, address, registration_date)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE))
     RETURNING *`,
    [customerCode, name, phone, email || null, address, registrationDate]
  );

  res.status(201).json({
    success: true,
    message: 'Customer added successfully.',
    data: result.rows[0],
  });
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const name = String(req.body.name ?? '').trim();
  const phone = String(req.body.phone ?? '').trim();
  const email = String(req.body.email ?? '').trim();
  const address = String(req.body.address ?? '').trim();

  if (!name) throw new AppError('Customer name is required.', 400);
  if (!phone) throw new AppError('Phone number is required.', 400);

  const result = await query(
    `UPDATE customers
     SET name = $1, phone = $2, email = $3, address = $4, updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [name, phone, email || null, address, id]
  );

  if (result.rowCount === 0) {
    throw new AppError('Customer not found.', 404);
  }

  res.json({
    success: true,
    message: 'Customer updated successfully.',
    data: result.rows[0],
  });
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await query('DELETE FROM customers WHERE id = $1 RETURNING id, name', [id]);
  if (result.rowCount === 0) {
    throw new AppError('Customer not found.', 404);
  }

  res.json({
    success: true,
    message: `Customer "${result.rows[0].name}" deleted successfully.`,
  });
});
