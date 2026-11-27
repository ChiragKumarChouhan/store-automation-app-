import { query, withTransaction } from '../config/db.js';
import { AppError, asyncHandler } from '../utils/appError.js';

function validateProductPayload(body, isUpdate = false) {
  const name = String(body.name ?? '').trim();
  const sku = String(body.sku ?? '').trim().toUpperCase();
  const purchasePrice = Number(body.purchase_price);
  const sellingPrice = Number(body.selling_price);
  const minStockLevel =
    body.min_stock_level !== undefined && body.min_stock_level !== ''
      ? Number(body.min_stock_level)
      : 5;
  const availableQuantity =
    body.available_quantity !== undefined && body.available_quantity !== ''
      ? Number(body.available_quantity)
      : 0;

  if (!name) throw new AppError('Product name is required.', 400);
  if (!sku) throw new AppError('SKU is required.', 400);
  if (Number.isNaN(purchasePrice) || purchasePrice < 0) {
    throw new AppError('Purchase price must be a non-negative number.', 400);
  }
  if (Number.isNaN(sellingPrice) || sellingPrice < 0) {
    throw new AppError('Selling price must be a non-negative number.', 400);
  }
  if (!Number.isInteger(minStockLevel) || minStockLevel < 0) {
    throw new AppError('Minimum stock level must be a non-negative whole number.', 400);
  }
  if (!isUpdate && (!Number.isInteger(availableQuantity) || availableQuantity < 0)) {
    throw new AppError('Initial stock quantity must be a non-negative whole number.', 400);
  }
  if (isUpdate && body.available_quantity !== undefined && (!Number.isInteger(availableQuantity) || availableQuantity < 0)) {
    throw new AppError('Available quantity must be a non-negative whole number.', 400);
  }

  return {
    name,
    sku,
    category_id: body.category_id ? Number(body.category_id) : null,
    supplier_id: body.supplier_id ? Number(body.supplier_id) : null,
    description: String(body.description ?? '').trim(),
    purchase_price: Number(purchasePrice.toFixed(2)),
    selling_price: Number(sellingPrice.toFixed(2)),
    min_stock_level: minStockLevel,
    available_quantity: availableQuantity,
  };
}

const SORT_COLUMNS = {
  name: 'p.name',
  sku: 'p.sku',
  selling_price: 'p.selling_price',
  purchase_price: 'p.purchase_price',
  available_quantity: 'i.available_quantity',
  created_at: 'p.created_at',
};

export const getProducts = asyncHandler(async (req, res) => {
  const {
    search = '',
    category_id = '',
    supplier_id = '',
    stock_status = '',
    sort_by = 'created_at',
    sort_order = 'desc',
    page = '1',
    limit = '10',
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  const params = [];

  if (search && String(search).trim()) {
    params.push(`%${String(search).trim()}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
  }

  if (category_id) {
    params.push(Number(category_id));
    conditions.push(`p.category_id = $${params.length}`);
  }

  if (supplier_id) {
    params.push(Number(supplier_id));
    conditions.push(`p.supplier_id = $${params.length}`);
  }

  if (stock_status === 'out_of_stock') {
    conditions.push(`i.available_quantity = 0`);
  } else if (stock_status === 'low_stock') {
    conditions.push(`i.available_quantity > 0 AND i.available_quantity <= i.min_stock_level`);
  } else if (stock_status === 'in_stock') {
    conditions.push(`i.available_quantity > i.min_stock_level`);
  } else if (stock_status === 'available') {
    conditions.push(`i.available_quantity > 0`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sortCol = SORT_COLUMNS[sort_by] || 'p.created_at';
  const sortDir = String(sort_order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const countRes = await query(
    `SELECT COUNT(*)::int AS total
     FROM products p
     JOIN inventory i ON i.product_id = p.id
     ${whereClause}`,
    params
  );
  const total = countRes.rows[0].total;

  const dataParams = [...params, limitNum, offset];
  const rowsRes = await query(
    `SELECT
       p.id,
       p.sku,
       p.name,
       p.category_id,
       COALESCE(c.name, 'Uncategorized') AS category_name,
       p.supplier_id,
       COALESCE(s.name, 'Unassigned') AS supplier_name,
       p.description,
       p.purchase_price::float8 AS purchase_price,
       p.selling_price::float8 AS selling_price,
       i.available_quantity,
       i.min_stock_level,
       i.last_restocked_at,
       p.created_at,
       p.updated_at,
       CASE
         WHEN i.available_quantity = 0 THEN 'out_of_stock'
         WHEN i.available_quantity <= i.min_stock_level THEN 'low_stock'
         ELSE 'in_stock'
       END AS stock_status
     FROM products p
     JOIN inventory i ON i.product_id = p.id
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN suppliers s ON s.id = p.supplier_id
     ${whereClause}
     ORDER BY ${sortCol} ${sortDir}, p.id DESC
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

export const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const prodRes = await query(
    `SELECT
       p.id,
       p.sku,
       p.name,
       p.category_id,
       COALESCE(c.name, 'Uncategorized') AS category_name,
       p.supplier_id,
       COALESCE(s.name, 'Unassigned') AS supplier_name,
       s.contact_person AS supplier_contact,
       s.phone AS supplier_phone,
       p.description,
       p.purchase_price::float8 AS purchase_price,
       p.selling_price::float8 AS selling_price,
       i.available_quantity,
       i.min_stock_level,
       i.last_restocked_at,
       p.created_at,
       p.updated_at,
       CASE
         WHEN i.available_quantity = 0 THEN 'out_of_stock'
         WHEN i.available_quantity <= i.min_stock_level THEN 'low_stock'
         ELSE 'in_stock'
       END AS stock_status
     FROM products p
     JOIN inventory i ON i.product_id = p.id
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN suppliers s ON s.id = p.supplier_id
     WHERE p.id = $1`,
    [id]
  );

  if (prodRes.rowCount === 0) {
    throw new AppError('Product not found.', 404);
  }

  const movementsRes = await query(
    `SELECT
       sm.id, sm.movement_type, sm.quantity_change, sm.previous_quantity,
       sm.new_quantity, sm.notes, sm.created_at,
       COALESCE(u.full_name, 'System') AS actor_name
     FROM stock_movements sm
     LEFT JOIN users u ON u.id = sm.created_by
     WHERE sm.product_id = $1
     ORDER BY sm.created_at DESC
     LIMIT 12`,
    [id]
  );

  res.json({
    success: true,
    data: {
      ...prodRes.rows[0],
      movements: movementsRes.rows,
    },
  });
});

export const createProduct = asyncHandler(async (req, res) => {
  const data = validateProductPayload(req.body, false);

  const created = await withTransaction(async (client) => {
    const prodRes = await client.query(
      `INSERT INTO products (
         sku, name, category_id, supplier_id, description, purchase_price, selling_price
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.sku,
        data.name,
        data.category_id,
        data.supplier_id,
        data.description,
        data.purchase_price,
        data.selling_price,
      ]
    );
    const product = prodRes.rows[0];

    await client.query(
      `INSERT INTO inventory (product_id, available_quantity, min_stock_level, last_restocked_at)
       VALUES ($1, $2, $3, CASE WHEN $2 > 0 THEN NOW() ELSE NULL END)`,
      [product.id, data.available_quantity, data.min_stock_level]
    );

    if (data.available_quantity > 0) {
      await client.query(
        `INSERT INTO stock_movements (
           product_id, movement_type, quantity_change, previous_quantity, new_quantity,
           reference_type, reference_id, notes, created_by
         ) VALUES ($1, 'IN', $2, 0, $2, 'opening_stock', $1, 'Initial stock on product creation', $3)`,
        [product.id, data.available_quantity, req.user.id]
      );
    }

    return product;
  });

  res.status(201).json({
    success: true,
    message: 'Product added successfully.',
    data: created,
  });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = validateProductPayload(req.body, true);

  const updated = await withTransaction(async (client) => {
    const existingRes = await client.query(
      `SELECT p.id, i.available_quantity
       FROM products p
       JOIN inventory i ON i.product_id = p.id
       WHERE p.id = $1
       FOR UPDATE`,
      [id]
    );

    if (existingRes.rowCount === 0) {
      throw new AppError('Product not found.', 404);
    }

    const prevQty = existingRes.rows[0].available_quantity;

    const prodRes = await client.query(
      `UPDATE products
       SET sku = $1, name = $2, category_id = $3, supplier_id = $4,
           description = $5, purchase_price = $6, selling_price = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        data.sku,
        data.name,
        data.category_id,
        data.supplier_id,
        data.description,
        data.purchase_price,
        data.selling_price,
        id,
      ]
    );

    const hasNewQty = req.body.available_quantity !== undefined && req.body.available_quantity !== '';
    const nextQty = hasNewQty ? data.available_quantity : prevQty;

    await client.query(
      `UPDATE inventory
       SET available_quantity = $1,
           min_stock_level = $2,
           last_restocked_at = CASE WHEN $1 > $3 THEN NOW() ELSE last_restocked_at END,
           updated_at = NOW()
       WHERE product_id = $4`,
      [nextQty, data.min_stock_level, prevQty, id]
    );

    if (hasNewQty && nextQty !== prevQty) {
      const diff = nextQty - prevQty;
      await client.query(
        `INSERT INTO stock_movements (
           product_id, movement_type, quantity_change, previous_quantity, new_quantity,
           reference_type, reference_id, notes, created_by
         ) VALUES ($1, 'ADJUSTMENT', $2, $3, $4, 'product_edit', $1, 'Updated via product form', $5)`,
        [id, diff, prevQty, nextQty, req.user.id]
      );
    }

    return prodRes.rows[0];
  });

  res.json({
    success: true,
    message: 'Product updated successfully.',
    data: updated,
  });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await query('DELETE FROM products WHERE id = $1 RETURNING id, name', [id]);
  if (result.rowCount === 0) {
    throw new AppError('Product not found.', 404);
  }

  res.json({
    success: true,
    message: `Product "${result.rows[0].name}" deleted successfully.`,
  });
});
