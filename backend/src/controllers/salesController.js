import { query, withTransaction } from '../config/db.js';
import { AppError, asyncHandler } from '../utils/appError.js';

export const getSales = asyncHandler(async (req, res) => {
  const {
    search = '',
    payment_method = '',
    start_date = '',
    end_date = '',
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
    conditions.push(
      `(s.invoice_number ILIKE $${params.length} OR COALESCE(c.name, 'Walk-in Customer') ILIKE $${params.length} OR COALESCE(u.full_name, '') ILIKE $${params.length})`
    );
  }

  if (payment_method) {
    params.push(payment_method);
    conditions.push(`s.payment_method = $${params.length}`);
  }

  if (start_date) {
    params.push(start_date);
    conditions.push(`s.sale_date::date >= $${params.length}::date`);
  }

  if (end_date) {
    params.push(end_date);
    conditions.push(`s.sale_date::date <= $${params.length}::date`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await query(
    `SELECT COUNT(*)::int AS total
     FROM sales s
     LEFT JOIN customers c ON c.id = s.customer_id
     LEFT JOIN users u ON u.id = s.sold_by
     ${whereClause}`,
    params
  );
  const total = countRes.rows[0].total;

  const dataParams = [...params, limitNum, offset];
  const rowsRes = await query(
    `SELECT
       s.id,
       s.invoice_number,
       s.customer_id,
       COALESCE(c.name, 'Walk-in Customer') AS customer_name,
       c.phone AS customer_phone,
       s.sold_by,
       COALESCE(u.full_name, 'System') AS sold_by_name,
       s.subtotal::float8 AS subtotal,
       s.discount_type,
       s.discount_value::float8 AS discount_value,
       s.discount_amount::float8 AS discount_amount,
       s.tax_rate::float8 AS tax_rate,
       s.tax_amount::float8 AS tax_amount,
       s.total_amount::float8 AS total_amount,
       s.payment_method,
       s.status,
       s.sale_date,
       (SELECT COALESCE(SUM(si.quantity), 0)::int FROM sale_items si WHERE si.sale_id = s.id) AS total_items
     FROM sales s
     LEFT JOIN customers c ON c.id = s.customer_id
     LEFT JOIN users u ON u.id = s.sold_by
     ${whereClause}
     ORDER BY s.sale_date DESC, s.id DESC
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

export const getSaleById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const saleRes = await query(
    `SELECT
       s.*,
       s.subtotal::float8 AS subtotal,
       s.discount_value::float8 AS discount_value,
       s.discount_amount::float8 AS discount_amount,
       s.tax_rate::float8 AS tax_rate,
       s.tax_amount::float8 AS tax_amount,
       s.total_amount::float8 AS total_amount,
       COALESCE(c.name, 'Walk-in Customer') AS customer_name,
       c.customer_code,
       c.phone AS customer_phone,
       c.email AS customer_email,
       c.address AS customer_address,
       COALESCE(u.full_name, 'System') AS sold_by_name
     FROM sales s
     LEFT JOIN customers c ON c.id = s.customer_id
     LEFT JOIN users u ON u.id = s.sold_by
     WHERE s.id = $1`,
    [id]
  );

  if (saleRes.rowCount === 0) {
    throw new AppError('Invoice not found.', 404);
  }

  const itemsRes = await query(
    `SELECT
       id, product_id, product_name, sku, quantity,
       unit_price::float8 AS unit_price,
       line_total::float8 AS line_total
     FROM sale_items
     WHERE sale_id = $1
     ORDER BY id ASC`,
    [id]
  );

  res.json({
    success: true,
    data: {
      ...saleRes.rows[0],
      items: itemsRes.rows,
    },
  });
});

export const createSale = asyncHandler(async (req, res) => {
  const {
    customer_id = null,
    items,
    discount_type = 'flat',
    discount_value = 0,
    payment_method = 'Cash',
    notes = '',
    idempotency_key = null,
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('At least one product must be added to the invoice.', 400);
  }
  if (!['flat', 'percent'].includes(discount_type)) {
    throw new AppError('Invalid discount type.', 400);
  }
  if (!['Cash', 'UPI', 'Card', 'Bank Transfer'].includes(payment_method)) {
    throw new AppError('Invalid payment method.', 400);
  }

  const discountVal = Number(discount_value) || 0;
  if (discountVal < 0) {
    throw new AppError('Discount cannot be negative.', 400);
  }
  if (discount_type === 'percent' && discountVal > 100) {
    throw new AppError('Percentage discount cannot exceed 100%.', 400);
  }

  // Merge duplicate product rows if submitted
  const mergedMap = new Map();
  for (const item of items) {
    const productId = Number(item.product_id);
    const qty = Number(item.quantity);
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new AppError('Invalid product selected.', 400);
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new AppError('Product quantity must be at least 1.', 400);
    }
    mergedMap.set(productId, (mergedMap.get(productId) || 0) + qty);
  }

  const consolidatedItems = Array.from(mergedMap.entries()).map(([product_id, quantity]) => ({
    product_id,
    quantity,
  }));

  const createdSale = await withTransaction(async (client) => {
    if (idempotency_key) {
      const existingSale = await client.query(
        'SELECT id, invoice_number FROM sales WHERE idempotency_key = $1',
        [String(idempotency_key)]
      );
      if (existingSale.rowCount > 0) {
        return { duplicate: true, id: existingSale.rows[0].id };
      }
    }

    if (customer_id) {
      const custCheck = await client.query('SELECT id FROM customers WHERE id = $1', [
        Number(customer_id),
      ]);
      if (custCheck.rowCount === 0) {
        throw new AppError('Selected customer does not exist.', 404);
      }
    }

    const settingsRes = await client.query(
      'SELECT invoice_prefix, default_tax_rate FROM store_settings WHERE id = 1'
    );
    const settings = settingsRes.rows[0] || { invoice_prefix: 'INV', default_tax_rate: 0 };
    const prefix = settings.invoice_prefix || 'INV';
    const taxRate = Number(settings.default_tax_rate) || 0;

    // Lock products and inventory rows in deterministic order to avoid deadlocks
    const productIds = consolidatedItems.map((i) => i.product_id).sort((a, b) => a - b);
    const prodRes = await client.query(
      `SELECT p.id, p.sku, p.name, p.purchase_price, p.selling_price, i.available_quantity
       FROM products p
       JOIN inventory i ON i.product_id = p.id
       WHERE p.id = ANY($1::int[])
       ORDER BY p.id ASC
       FOR UPDATE OF i`,
      [productIds]
    );

    const prodMap = new Map(prodRes.rows.map((r) => [r.id, r]));
    let subtotal = 0;
    const preparedItems = [];

    for (const reqItem of consolidatedItems) {
      const prod = prodMap.get(reqItem.product_id);
      if (!prod) {
        throw new AppError(`Product ID ${reqItem.product_id} was not found.`, 404);
      }
      if (prod.available_quantity < reqItem.quantity) {
        throw new AppError(
          `Insufficient stock for "${prod.name}". Requested ${reqItem.quantity}, available ${prod.available_quantity}.`,
          400
        );
      }

      const unitPrice = Number(prod.selling_price);
      const purchasePrice = Number(prod.purchase_price);
      const lineTotal = Number((unitPrice * reqItem.quantity).toFixed(2));
      subtotal += lineTotal;

      preparedItems.push({
        product_id: prod.id,
        product_name: prod.name,
        sku: prod.sku,
        quantity: reqItem.quantity,
        unit_price: unitPrice,
        purchase_price: purchasePrice,
        line_total: lineTotal,
        previous_quantity: prod.available_quantity,
        new_quantity: prod.available_quantity - reqItem.quantity,
      });
    }

    subtotal = Number(subtotal.toFixed(2));
    let discountAmount =
      discount_type === 'percent'
        ? Number(((subtotal * discountVal) / 100).toFixed(2))
        : Number(discountVal.toFixed(2));

    if (discountAmount > subtotal) {
      throw new AppError('Discount amount cannot exceed subtotal.', 400);
    }

    const taxableAmount = Number((subtotal - discountAmount).toFixed(2));
    const taxAmount = Number(((taxableAmount * taxRate) / 100).toFixed(2));
    const totalAmount = Number((taxableAmount + taxAmount).toFixed(2));

    // Generate unique invoice number using sequence + year
    const year = new Date().getFullYear();
    const seqRes = await client.query(
      `SELECT COALESCE(MAX(id), 0) + 1 AS next_seq FROM sales`
    );
    const nextSeq = String(seqRes.rows[0].next_seq).padStart(4, '0');
    const invoiceNumber = `${prefix}-${year}-${nextSeq}`;

    const saleInsert = await client.query(
      `INSERT INTO sales (
         invoice_number, idempotency_key, customer_id, sold_by,
         subtotal, discount_type, discount_value, discount_amount,
         tax_rate, tax_amount, total_amount, payment_method, status, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'completed', $13)
       RETURNING *`,
      [
        invoiceNumber,
        idempotency_key ? String(idempotency_key) : null,
        customer_id ? Number(customer_id) : null,
        req.user.id,
        subtotal,
        discount_type,
        discountVal,
        discountAmount,
        taxRate,
        taxAmount,
        totalAmount,
        payment_method,
        String(notes).trim(),
      ]
    );
    const sale = saleInsert.rows[0];

    for (const item of preparedItems) {
      await client.query(
        `INSERT INTO sale_items (
           sale_id, product_id, product_name, sku, quantity, unit_price, purchase_price, line_total
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          sale.id,
          item.product_id,
          item.product_name,
          item.sku,
          item.quantity,
          item.unit_price,
          item.purchase_price,
          item.line_total,
        ]
      );

      await client.query(
        `UPDATE inventory
         SET available_quantity = $1, updated_at = NOW()
         WHERE product_id = $2`,
        [item.new_quantity, item.product_id]
      );

      await client.query(
        `INSERT INTO stock_movements (
           product_id, movement_type, quantity_change, previous_quantity, new_quantity,
           reference_type, reference_id, notes, created_by
         ) VALUES ($1, 'SALE', $2, $3, $4, 'sale', $5, $6, $7)`,
        [
          item.product_id,
          -item.quantity,
          item.previous_quantity,
          item.new_quantity,
          sale.id,
          `Invoice ${invoiceNumber}`,
          req.user.id,
        ]
      );
    }

    return { duplicate: false, id: sale.id, invoice_number: invoiceNumber };
  });

  // Return full invoice details
  const detailRes = await query(
    `SELECT
       s.*,
       s.subtotal::float8 AS subtotal,
       s.discount_value::float8 AS discount_value,
       s.discount_amount::float8 AS discount_amount,
       s.tax_rate::float8 AS tax_rate,
       s.tax_amount::float8 AS tax_amount,
       s.total_amount::float8 AS total_amount,
       COALESCE(c.name, 'Walk-in Customer') AS customer_name,
       c.customer_code,
       c.phone AS customer_phone,
       c.email AS customer_email,
       c.address AS customer_address,
       COALESCE(u.full_name, 'System') AS sold_by_name
     FROM sales s
     LEFT JOIN customers c ON c.id = s.customer_id
     LEFT JOIN users u ON u.id = s.sold_by
     WHERE s.id = $1`,
    [createdSale.id]
  );

  const itemsRes = await query(
    `SELECT id, product_id, product_name, sku, quantity,
            unit_price::float8 AS unit_price, line_total::float8 AS line_total
     FROM sale_items WHERE sale_id = $1 ORDER BY id ASC`,
    [createdSale.id]
  );

  res.status(createdSale.duplicate ? 200 : 201).json({
    success: true,
    message: createdSale.duplicate
      ? 'Transaction already recorded.'
      : `Invoice ${detailRes.rows[0].invoice_number} created successfully.`,
    data: {
      ...detailRes.rows[0],
      items: itemsRes.rows,
    },
  });
});
