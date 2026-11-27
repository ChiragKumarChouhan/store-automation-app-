import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  IndianRupee,
  Package,
  Receipt,
  RefreshCw,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { dashboardService } from '../services/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import KpiCard from '../components/common/KpiCard.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

const PIE_COLORS = ['#2563eb', '#0f766e', '#d97706', '#475569', '#64748b'];

export default function DashboardPage() {
  const { formatCurrency } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await dashboardService.getStats();
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <LoadingSpinner label="Loading live store statistics..." />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        <p className="font-medium">{error}</p>
        <button
          type="button"
          onClick={loadDashboard}
          className="mt-3 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const {
    kpis,
    salesOverview,
    monthlyRevenue,
    categoryDistribution,
    recentTransactions,
    lowStockAlerts,
    recentActivities,
  } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Real-time overview of inventory, sales performance, and store activity.
          </p>
        </div>
        <button
          type="button"
          onClick={loadDashboard}
          className="inline-flex items-center gap-1.5 self-start rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Data
        </button>
      </div>

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          title="Total Products"
          value={kpis.totalProducts}
          subtitle="Active SKUs"
          icon={Package}
          tone="blue"
        />
        <KpiCard
          title="Total Inventory"
          value={kpis.totalInventory}
          subtitle="Units in stock"
          icon={Boxes}
          tone="slate"
        />
        <KpiCard
          title="Total Sales"
          value={kpis.totalSales}
          subtitle="Completed orders"
          icon={Receipt}
          tone="emerald"
        />
        <KpiCard
          title="Total Revenue"
          value={formatCurrency(kpis.totalRevenue)}
          subtitle="Net billed amount"
          icon={IndianRupee}
          tone="blue"
        />
        <KpiCard
          title="Low Stock Products"
          value={kpis.lowStockProducts}
          subtitle="At or below min level"
          icon={AlertTriangle}
          tone={kpis.lowStockProducts > 0 ? 'amber' : 'emerald'}
        />
        <KpiCard
          title="Total Customers"
          value={kpis.totalCustomers}
          subtitle="Registered profiles"
          icon={Users}
          tone="slate"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Sales Overview (Last 14 Days)
            </h2>
            <p className="text-xs text-slate-500">Daily revenue trend from completed invoices</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesOverview}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), 'Revenue']}
                  contentStyle={{ fontSize: '12px', borderRadius: '6px' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2563eb"
                  fill="#dbeafe"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Product Category Distribution
            </h2>
            <p className="text-xs text-slate-500">Catalog share by category</p>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  dataKey="product_count"
                  nameKey="name"
                  innerRadius={42}
                  outerRadius={72}
                  paddingAngle={2}
                >
                  {categoryDistribution.map((entry, idx) => (
                    <Cell
                      key={entry.name}
                      fill={PIE_COLORS[idx % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '6px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1.5">
            {categoryDistribution.map((cat, idx) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-xs"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="truncate text-slate-700">{cat.name}</span>
                </div>
                <span className="font-medium text-slate-900">
                  {cat.product_count} ({cat.total_units} qty)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Revenue & Low-Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Monthly Revenue (Last 6 Months)
            </h2>
            <p className="text-xs text-slate-500">Aggregated monthly sales billing</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), 'Revenue']}
                  contentStyle={{ fontSize: '12px', borderRadius: '6px' }}
                />
                <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Low-Stock Alerts</h2>
              <p className="text-xs text-slate-500">Items needing restock</p>
            </div>
            <Link
              to="/inventory?stock_status=low_stock"
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              View all
            </Link>
          </div>

          {lowStockAlerts.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              All inventory items are adequately stocked.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {lowStockAlerts.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-900">{item.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {item.sku} · {item.category_name}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
                      item.available_quantity === 0
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {item.available_quantity} / {item.min_stock_level}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions & Recent Inventory Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Recent Transactions</h2>
              <p className="text-xs text-slate-500">Latest sales invoices</p>
            </div>
            <Link to="/sales" className="text-xs font-medium text-blue-600 hover:underline">
              Open Sales
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">No sales recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-2 font-medium">Invoice</th>
                    <th className="pb-2 font-medium">Customer</th>
                    <th className="pb-2 font-medium">Items</th>
                    <th className="pb-2 font-medium">Payment</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="py-2.5 font-mono font-medium text-slate-900">
                        {tx.invoice_number}
                      </td>
                      <td className="py-2.5 text-slate-700">{tx.customer_name}</td>
                      <td className="py-2.5 text-slate-600">{tx.item_count}</td>
                      <td className="py-2.5 text-slate-600">{tx.payment_method}</td>
                      <td className="py-2.5 text-right font-semibold text-slate-900">
                        {formatCurrency(tx.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Recent Inventory Activities
              </h2>
              <p className="text-xs text-slate-500">Stock movements and sales deductions</p>
            </div>
            <Link to="/inventory" className="text-xs font-medium text-blue-600 hover:underline">
              View Inventory
            </Link>
          </div>

          {recentActivities.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">No stock activities logged.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentActivities.map((act) => {
                const positive = act.quantity_change > 0;
                return (
                  <div key={act.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded ${
                          positive
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {positive ? (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-slate-900">
                          {act.product_name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {act.movement_type} · {act.notes || act.sku} · by {act.actor_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`text-xs font-semibold ${
                          positive ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {positive ? `+${act.quantity_change}` : act.quantity_change}
                      </span>
                      <p className="text-[11px] text-slate-400">Bal: {act.new_quantity}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
