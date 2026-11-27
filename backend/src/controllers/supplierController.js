import { query } from '../config/db.js';
import { AppError, asyncHandler } from '../utils/appError.js';

export const getSuppliers = asyncHandler(async (req, res) => {
  const { search = '' } = req.query;
  const params = [];
  let whereClause = '';

  if (search && String(search).trim()) {
    params.push(`%${String(search).trim()}%`);
    whereClause = `WHERE s.name ILIKE $1 OR s.contact_person ILIKE $1 OR s.phone ILIKE $1 OR COALESCE(s.email, '') ILIKE $1`;
  }

  const result = await query(
    `SELECT
       s.*,
       COUNT(p.id)::int AS products_count,
       COALESCE(
         JSON_AGG(
           JSON_BUILD_OBJECT(
             'id', p.id,
             'sku', p.sku,
             'name', p.name,
             'selling_price', p.selling_price::float8,
             'available_quantity', COALESCE(i.available_quantity, 0)
           )
         ) FILTER (WHERE p.id IS NOT NULL),
         '[]'::json
       ) AS products_supplied
     FROM suppliers s
     LEFT JOIN products p ON p.supplier_id = s.id
     LEFT JOIN inventory i ON i.product_id = p.id
     ${whereClause}
     GROUP BY s.id
     ORDER BY s.name ASC`,
    params
  );

  res.json({ success: true, data: result.rows });
});

export const getSupplierById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const supRes = await query('SELECT * FROM suppliers WHERE id = $1', [id]);
  if (supRes.rowCount === 0) {
    throw new AppError('Supplier not found.', 404);
  }

  const prodRes = await query(
    `SELECT p.id, p.sku, p.name, p.purchase_price::float8 AS purchase_price,
            p.selling_price::float8 AS selling_price,
            COALESCE(i.available_quantity, 0) AS available_quantity
     FROM products p
     LEFT JOIN inventory i ON i.product_id = p.id
     WHERE p.supplier_id = $1
     ORDER BY p.name ASC`,
    [id]
  );

  res.json({
    success: true,
    data: {
      ...supRes.rows[0],
      products_supplied: prodRes.rows,
    },
  });
});

export const createSupplier = asyncHandler(async (req, res) => {
  const name = String(req.body.name ?? '').trim();
  const contactPerson = String(req.body.contact_person ?? '').trim();
  const phone = String(req.body.phone ?? '').trim();
  const email = String(req.body.email ?? '').trim();
  const address = String(req.body.address ?? '').trim();

  if (!name) throw new AppError('Supplier name is required.', 400);
  if (!contactPerson) throw new AppError('Contact person is required.', 400);
  if (!phone) throw new AppError('Phone number is required.', 400);

  const result = await query(
    `INSERT INTO suppliers (name, contact_person, phone, email, address)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, contactPerson, phone, email || null, address]
  );

  res.status(201).json({
    success: true,
    message: 'Supplier added successfully.',
    data: result.rows[0],
  });
});

export const updateSupplier = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const name = String(req.body.name ?? '').trim();
  const contactPerson = String(req.body.contact_person ?? '').trim();
  const phone = String(req.body.phone ?? '').trim();
  const email = String(req.body.email ?? '').trim();
  const address = String(req.body.address ?? '').trim();

  if (!name) throw new AppError('Supplier name is required.', 400);
  if (!contactPerson) throw new AppError('Contact person is required.', 400);
  if (!phone) throw new AppError('Phone number is required.', 400);

  const result = await query(
    `UPDATE suppliers
     SET name = $1, contact_person = $2, phone = $3, email = $4, address = $5, updated_at = NOW()
     WHERE id = $6
     RETURNING *`,
    [name, contactPerson, phone, email || null, address, id]
  );

  if (result.rowCount === 0) {
    throw new AppError('Supplier not found.', 404);
  }

  res.json({
    success: true,
    message: 'Supplier updated successfully.',
    data: result.rows[0],
  });
});

export const deleteSupplier = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await query('DELETE FROM suppliers WHERE id = $1 RETURNING id, name', [id]);
  if (result.rowCount === 0) {
    throw new AppError('Supplier not found.', 404);
  }

  res.json({
    success: true,
    message: `Supplier "${result.rows[0].name}" deleted successfully.`,
  });
});
