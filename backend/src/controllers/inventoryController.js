import { query, withTransaction } from '../config/db.js';
import { AppError, asyncHandler } from '../utils/appError.js';

export const getInventorySummary = asyncHandler(async (req, res) => {
  const summaryRes = await query(`
    SELECT
      COUNT(p.id)::int AS total_skus,
      COALESCE(SUM(i.available_quantity), 0)::int AS total_units,
      COUNT(*) FILTER (WHERE i.available_quantity = 0)::int AS out_of_stock_count,
      COUNT(*) FILTER (WHERE i.available_quantity > 0 AND i.available_quantity <= i.min_stock_level)::int AS low_stock_count,
      COALESCE(SUM(i.available_quantity * p.purchase_price), 0)::numeric(14,2) AS cost_valuation,
      COALESCE(SUM(i.available_quantity * p.selling_price), 0)::numeric(14,2) AS retail_valuation
    FROM products p
    JOIN inventory i ON i.product_id = p.id
  `);

  const row = summaryRes.rows[0];
  res.json({
    success: true,
    data: {
      totalSkus: row.total_skus,
      totalUnits: row.total_units,
      outOfStockCount: row.out_of_stock_count,
      lowStockCount: row.low_stock_count,
      costValuation: Number(row.cost_valuation),
      retailValuation: Number(row.retail_valuation),
    },
  });
});

export const adjustStock = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { movement_type, quantity, min_stock_level, notes = '' } = req.body;

  if (!['IN', 'OUT', 'ADJUSTMENT'].includes(movement_type)) {
    throw new AppError('Movement type must be IN, OUT, or ADJUSTMENT.', 400);
  }

  const qtyNum = Number(quantity);
  if (!Number.isInteger(qtyNum) || qtyNum < 0 || (movement_type !== 'ADJUSTMENT' && qtyNum === 0)) {
    throw new AppError('Quantity must be a valid whole number.', 400);
  }

  const result = await withTransaction(async (client) => {
    const invRes = await client.query(
      `SELECT i.id, i.available_quantity, i.min_stock_level, p.name
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       WHERE i.product_id = $1
       FOR UPDATE`,
      [productId]
    );

    if (invRes.rowCount === 0) {
      throw new AppError('Inventory record not found for this product.', 404);
    }

    const current = invRes.rows[0];
    const prevQty = current.available_quantity;
    let newQty = prevQty;
    let change = 0;

    if (movement_type === 'IN') {
      newQty = prevQty + qtyNum;
      change = qtyNum;
    } else if (movement_type === 'OUT') {
      if (qtyNum > prevQty) {
        throw new AppError(
          `Insufficient stock for "${current.name}". Available: ${prevQty}.`,
          400
        );
      }
      newQty = prevQty - qtyNum;
      change = -qtyNum;
    } else {
      newQty = qtyNum;
      change = newQty - prevQty;
    }

    const nextMinLevel =
      min_stock_level !== undefined && min_stock_level !== ''
        ? Number(min_stock_level)
        : current.min_stock_level;

    if (!Number.isInteger(nextMinLevel) || nextMinLevel < 0) {
      throw new AppError('Minimum stock level must be a non-negative integer.', 400);
    }

    const updatedInv = await client.query(
      `UPDATE inventory
       SET available_quantity = $1,
           min_stock_level = $2,
           last_restocked_at = CASE WHEN $3 > 0 THEN NOW() ELSE last_restocked_at END,
           updated_at = NOW()
       WHERE product_id = $4
       RETURNING *`,
      [newQty, nextMinLevel, change, productId]
    );

    if (change !== 0) {
      await client.query(
        `INSERT INTO stock_movements (
           product_id, movement_type, quantity_change, previous_quantity, new_quantity,
           reference_type, reference_id, notes, created_by
         ) VALUES ($1, $2, $3, $4, $5, 'manual_adjustment', $1, $6, $7)`,
        [
          productId,
          movement_type,
          change,
          prevQty,
          newQty,
          String(notes).trim() || `Manual stock ${movement_type}`,
          req.user.id,
        ]
      );
    }

    return updatedInv.rows[0];
  });

  res.json({
    success: true,
    message: 'Inventory updated successfully.',
    data: result,
  });
});

export const getStockMovements = asyncHandler(async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
  const result = await query(
    `SELECT
       sm.id,
       sm.product_id,
       p.name AS product_name,
       p.sku,
       sm.movement_type,
       sm.quantity_change,
       sm.previous_quantity,
       sm.new_quantity,
       sm.reference_type,
       sm.notes,
       sm.created_at,
       COALESCE(u.full_name, 'System') AS actor_name
     FROM stock_movements sm
     JOIN products p ON p.id = sm.product_id
     LEFT JOIN users u ON u.id = sm.created_by
     ORDER BY sm.created_at DESC
     LIMIT $1`,
    [limit]
  );

  res.json({ success: true, data: result.rows });
});
