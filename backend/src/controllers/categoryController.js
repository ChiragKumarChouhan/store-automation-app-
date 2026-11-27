import { query } from '../config/db.js';
import { AppError, asyncHandler } from '../utils/appError.js';

export const getCategories = asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT
      c.id,
      c.name,
      c.description,
      c.created_at,
      COUNT(p.id)::int AS product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY c.name ASC
  `);

  res.json({ success: true, data: result.rows });
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name, description = '' } = req.body;
  if (!name || !String(name).trim()) {
    throw new AppError('Category name is required.', 400);
  }

  const result = await query(
    `INSERT INTO categories (name, description)
     VALUES ($1, $2)
     RETURNING *`,
    [String(name).trim(), String(description).trim()]
  );

  res.status(201).json({
    success: true,
    message: 'Category created successfully.',
    data: result.rows[0],
  });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description = '' } = req.body;

  if (!name || !String(name).trim()) {
    throw new AppError('Category name is required.', 400);
  }

  const result = await query(
    `UPDATE categories
     SET name = $1, description = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [String(name).trim(), String(description).trim(), id]
  );

  if (result.rowCount === 0) {
    throw new AppError('Category not found.', 404);
  }

  res.json({
    success: true,
    message: 'Category updated successfully.',
    data: result.rows[0],
  });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const inUse = await query(
    'SELECT COUNT(*)::int AS count FROM products WHERE category_id = $1',
    [id]
  );

  if (inUse.rows[0].count > 0) {
    throw new AppError(
      'Cannot delete category while products are assigned to it. Reassign those products first.',
      400
    );
  }

  const result = await query('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
  if (result.rowCount === 0) {
    throw new AppError('Category not found.', 404);
  }

  res.json({
    success: true,
    message: 'Category deleted successfully.',
  });
});
