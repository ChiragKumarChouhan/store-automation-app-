import { query } from '../config/db.js';
import { asyncHandler } from '../utils/appError.js';

export const getReports = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;

  const endDate = end_date || new Date().toISOString().slice(0, 10);
  const startDateObj = new Date(endDate);
  startDateObj.setDate(startDateObj.getDate() - 89);
  const startDate = start_date || startDateObj.toISOString().slice(0, 10);

  const [
    revenueSummaryRes,
    dailySalesRes,
    weeklySalesRes,
    monthlySalesRes,
    bestSellingRes,
    lowStockRes,
    valuationRes,
    categorySalesRes,
  ] = await Promise.all([
    query(
      `SELECT
         COUNT(s.id)::int AS total_invoices,
         COALESCE(SUM(s.subtotal), 0)::float8 AS gross_sales,
         COALESCE(SUM(s.discount_amount), 0)::float8 AS total_discounts,
         COALESCE(SUM(s.tax_amount), 0)::float8 AS total_tax,
         COALESCE(SUM(s.total_amount), 0)::float8 AS net_revenue,
         COALESCE(AVG(s.total_amount), 0)::float8 AS avg_order_value,
         COALESCE((
           SELECT SUM((si.unit_price - si.purchase_price) * si.quantity)
           FROM sale_items si
           JOIN sales s2 ON s2.id = si.sale_id
           WHERE s2.status = 'completed'
             AND s2.sale_date::date BETWEEN $1::date AND $2::date
         ), 0)::float8 AS estimated_profit
       FROM sales s
       WHERE s.status = 'completed'
         AND s.sale_date::date BETWEEN $1::date AND $2::date`,
      [startDate, endDate]
    ),
    query(
      `SELECT
         s.sale_date::date AS date,
         TO_CHAR(s.sale_date::date, 'DD Mon YYYY') AS label,
         COUNT(s.id)::int AS orders_count,
         COALESCE(SUM(s.total_amount), 0)::float8 AS revenue
       FROM sales s
       WHERE s.status = 'completed'
         AND s.sale_date::date BETWEEN $1::date AND $2::date
       GROUP BY s.sale_date::date
       ORDER BY s.sale_date::date ASC`,
      [startDate, endDate]
    ),
    query(
      `SELECT
         DATE_TRUNC('week', s.sale_date)::date AS week_start,
         'Week of ' || TO_CHAR(DATE_TRUNC('week', s.sale_date), 'DD Mon') AS label,
         COUNT(s.id)::int AS orders_count,
         COALESCE(SUM(s.total_amount), 0)::float8 AS revenue
       FROM sales s
       WHERE s.status = 'completed'
         AND s.sale_date::date BETWEEN $1::date AND $2::date
       GROUP BY DATE_TRUNC('week', s.sale_date)
       ORDER BY week_start ASC`,
      [startDate, endDate]
    ),
    query(
      `SELECT
         DATE_TRUNC('month', s.sale_date)::date AS month_start,
         TO_CHAR(DATE_TRUNC('month', s.sale_date), 'Mon YYYY') AS label,
         COUNT(s.id)::int AS orders_count,
         COALESCE(SUM(s.total_amount), 0)::float8 AS revenue
       FROM sales s
       WHERE s.status = 'completed'
         AND s.sale_date::date BETWEEN $1::date AND $2::date
       GROUP BY DATE_TRUNC('month', s.sale_date)
       ORDER BY month_start ASC`,
      [startDate, endDate]
    ),
    query(
      `SELECT
         si.sku,
         si.product_name,
         SUM(si.quantity)::int AS units_sold,
         COALESCE(SUM(si.line_total), 0)::float8 AS total_revenue,
         COALESCE(SUM((si.unit_price - si.purchase_price) * si.quantity), 0)::float8 AS profit
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE s.status = 'completed'
         AND s.sale_date::date BETWEEN $1::date AND $2::date
       GROUP BY si.sku, si.product_name
       ORDER BY units_sold DESC, total_revenue DESC
       LIMIT 10`,
      [startDate, endDate]
    ),
    query(`
      SELECT
        p.id, p.sku, p.name,
        COALESCE(c.name, 'Uncategorized') AS category_name,
        COALESCE(sup.name, 'Unassigned') AS supplier_name,
        i.available_quantity,
        i.min_stock_level,
        p.purchase_price::float8 AS purchase_price,
        p.selling_price::float8 AS selling_price
      FROM products p
      JOIN inventory i ON i.product_id = p.id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN suppliers sup ON sup.id = p.supplier_id
      WHERE i.available_quantity <= i.min_stock_level
      ORDER BY i.available_quantity ASC, p.name ASC
    `),
    query(`
      SELECT
        COALESCE(c.name, 'Uncategorized') AS category_name,
        COUNT(p.id)::int AS product_count,
        COALESCE(SUM(i.available_quantity), 0)::int AS total_units,
        COALESCE(SUM(i.available_quantity * p.purchase_price), 0)::float8 AS cost_value,
        COALESCE(SUM(i.available_quantity * p.selling_price), 0)::float8 AS retail_value
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      LEFT JOIN inventory i ON i.product_id = p.id
      GROUP BY c.id, c.name
      ORDER BY retail_value DESC
    `),
    query(
      `SELECT
         COALESCE(c.name, 'Uncategorized') AS category_name,
         COALESCE(SUM(si.quantity), 0)::int AS units_sold,
         COALESCE(SUM(si.line_total), 0)::float8 AS revenue
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       LEFT JOIN products p ON p.id = si.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE s.status = 'completed'
         AND s.sale_date::date BETWEEN $1::date AND $2::date
       GROUP BY c.name
       ORDER BY revenue DESC`,
      [startDate, endDate]
    ),
  ]);

  const valuationTotals = valuationRes.rows.reduce(
    (acc, row) => ({
      totalUnits: acc.totalUnits + row.total_units,
      totalCostValue: Number((acc.totalCostValue + row.cost_value).toFixed(2)),
      totalRetailValue: Number((acc.totalRetailValue + row.retail_value).toFixed(2)),
    }),
    { totalUnits: 0, totalCostValue: 0, totalRetailValue: 0 }
  );

  res.json({
    success: true,
    data: {
      dateRange: { startDate, endDate },
      revenueSummary: revenueSummaryRes.rows[0],
      dailySales: dailySalesRes.rows,
      weeklySales: weeklySalesRes.rows,
      monthlySales: monthlySalesRes.rows,
      bestSellingProducts: bestSellingRes.rows,
      lowStockReport: lowStockRes.rows,
      inventoryValuation: {
        totals: valuationTotals,
        byCategory: valuationRes.rows,
      },
      categoryWiseSales: categorySalesRes.rows,
    },
  });
});
