import { query } from '../config/db.js';
import { asyncHandler } from '../utils/appError.js';

export const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    kpiRes,
    salesOverviewRes,
    monthlyRevenueRes,
    categoryDistRes,
    recentTransactionsRes,
    lowStockRes,
    recentActivitiesRes,
  ] = await Promise.all([
    query(`
      SELECT
        (SELECT COUNT(*)::int FROM products) AS total_products,
        (SELECT COALESCE(SUM(available_quantity), 0)::int FROM inventory) AS total_inventory,
        (SELECT COUNT(*)::int FROM sales WHERE status = 'completed') AS total_sales,
        (SELECT COALESCE(SUM(total_amount), 0)::numeric(12,2) FROM sales WHERE status = 'completed') AS total_revenue,
        (SELECT COUNT(*)::int FROM inventory WHERE available_quantity <= min_stock_level) AS low_stock_products,
        (SELECT COUNT(*)::int FROM customers) AS total_customers
    `),
    query(`
      SELECT
        TO_CHAR(d::date, 'Mon DD') AS label,
        d::date AS date,
        COUNT(s.id)::int AS sales_count,
        COALESCE(SUM(s.total_amount), 0)::numeric(12,2) AS revenue
      FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day') AS d
      LEFT JOIN sales s
        ON s.sale_date::date = d::date AND s.status = 'completed'
      GROUP BY d::date
      ORDER BY d::date ASC
    `),
    query(`
      SELECT
        TO_CHAR(m, 'Mon YYYY') AS label,
        DATE_TRUNC('month', m)::date AS month_date,
        COUNT(s.id)::int AS sales_count,
        COALESCE(SUM(s.total_amount), 0)::numeric(12,2) AS revenue
      FROM generate_series(
        DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months',
        DATE_TRUNC('month', CURRENT_DATE),
        INTERVAL '1 month'
      ) AS m
      LEFT JOIN sales s
        ON DATE_TRUNC('month', s.sale_date) = DATE_TRUNC('month', m)
        AND s.status = 'completed'
      GROUP BY m
      ORDER BY m ASC
    `),
    query(`
      SELECT
        COALESCE(c.name, 'Uncategorized') AS name,
        COUNT(p.id)::int AS product_count,
        COALESCE(SUM(i.available_quantity), 0)::int AS total_units
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      LEFT JOIN inventory i ON i.product_id = p.id
      GROUP BY c.id, c.name
      ORDER BY product_count DESC, c.name ASC
    `),
    query(`
      SELECT
        s.id,
        s.invoice_number,
        s.total_amount,
        s.payment_method,
        s.status,
        s.sale_date,
        COALESCE(c.name, 'Walk-in Customer') AS customer_name,
        COALESCE(u.full_name, 'System') AS sold_by_name,
        (SELECT COALESCE(SUM(si.quantity), 0)::int FROM sale_items si WHERE si.sale_id = s.id) AS item_count
      FROM sales s
      LEFT JOIN customers c ON c.id = s.customer_id
      LEFT JOIN users u ON u.id = s.sold_by
      ORDER BY s.sale_date DESC
      LIMIT 6
    `),
    query(`
      SELECT
        p.id,
        p.sku,
        p.name,
        COALESCE(c.name, 'Uncategorized') AS category_name,
        i.available_quantity,
        i.min_stock_level
      FROM products p
      JOIN inventory i ON i.product_id = p.id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE i.available_quantity <= i.min_stock_level
      ORDER BY i.available_quantity ASC, p.name ASC
      LIMIT 8
    `),
    query(`
      SELECT
        sm.id,
        sm.movement_type,
        sm.quantity_change,
        sm.previous_quantity,
        sm.new_quantity,
        sm.notes,
        sm.created_at,
        p.name AS product_name,
        p.sku,
        COALESCE(u.full_name, 'System') AS actor_name
      FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id
      LEFT JOIN users u ON u.id = sm.created_by
      ORDER BY sm.created_at DESC
      LIMIT 8
    `),
  ]);

  const kpis = kpiRes.rows[0];

  res.json({
    success: true,
    data: {
      kpis: {
        totalProducts: kpis.total_products,
        totalInventory: kpis.total_inventory,
        totalSales: kpis.total_sales,
        totalRevenue: Number(kpis.total_revenue),
        lowStockProducts: kpis.low_stock_products,
        totalCustomers: kpis.total_customers,
      },
      salesOverview: salesOverviewRes.rows.map((r) => ({
        ...r,
        revenue: Number(r.revenue),
      })),
      monthlyRevenue: monthlyRevenueRes.rows.map((r) => ({
        ...r,
        revenue: Number(r.revenue),
      })),
      categoryDistribution: categoryDistRes.rows,
      recentTransactions: recentTransactionsRes.rows.map((r) => ({
        ...r,
        total_amount: Number(r.total_amount),
      })),
      lowStockAlerts: lowStockRes.rows,
      recentActivities: recentActivitiesRes.rows,
    },
  });
});
