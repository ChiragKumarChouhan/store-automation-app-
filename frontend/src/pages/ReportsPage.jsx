import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { reportService } from '../services/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

const COLORS = ['#2563eb', '#0f766e', '#d97706', '#475569', '#64748b'];

function getPresetDates(daysBack) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - daysBack);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function downloadCsv(filename, headers, rows) {
  const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { formatCurrency } = useAuth();
  const toast = useToast();

  const initialRange = getPresetDates(89);
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const [granularity, setGranularity] = useState('monthly');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportService.get({
        start_date: startDate,
        end_date: endDate,
      });
      setData(res.data);
    } catch (err) {
      toast.error(err.message || 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, toast]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const applyPreset = (daysBack) => {
    const range = getPresetDates(daysBack);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  if (loading && !data) {
    return <LoadingSpinner label="Generating analytics reports..." />;
  }

  const activeSalesSeries =
    granularity === 'daily'
      ? data?.dailySales || []
      : granularity === 'weekly'
      ? data?.weeklySales || []
      : data?.monthlySales || [];

  const handleExportSalesCsv = () => {
    downloadCsv(
      `sales-report-${granularity}-${startDate}-to-${endDate}.csv`,
      ['Period', 'Orders', 'Revenue'],
      activeSalesSeries.map((r) => [r.label, r.orders_count, r.revenue])
    );
  };

  const handleExportLowStockCsv = () => {
    downloadCsv(
      `low-stock-report-${new Date().toISOString().slice(0, 10)}.csv`,
      ['SKU', 'Product', 'Category', 'Supplier', 'Available Qty', 'Min Level'],
      (data?.lowStockReport || []).map((r) => [
        r.sku,
        r.name,
        r.category_name,
        r.supplier_name,
        r.available_quantity,
        r.min_stock_level,
      ])
    );
  };

  const rev = data?.revenueSummary || {};
  const valuation = data?.inventoryValuation || { totals: {}, byCategory: [] };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Reports &amp; Analytics</h1>
          <p className="text-sm text-slate-500">
            Sales trends, revenue breakdown, category performance, and inventory valuation.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportSalesCsv}
          className="inline-flex items-center gap-1.5 self-start rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Export Sales CSV
        </button>
      </div>

      {/* Date Filters */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyPreset(0)}
            className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => applyPreset(6)}
            className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => applyPreset(29)}
            className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            Last 30 Days
          </button>
          <button
            type="button"
            onClick={() => applyPreset(89)}
            className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            Last 90 Days
          </button>
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Invoices</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{rev.total_invoices ?? 0}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Gross Sales</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {formatCurrency(rev.gross_sales)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Discounts Given</p>
          <p className="mt-1 text-xl font-semibold text-amber-700">
            {formatCurrency(rev.total_discounts)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Net Revenue</p>
          <p className="mt-1 text-xl font-semibold text-blue-700">
            {formatCurrency(rev.net_revenue)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Estimated Profit</p>
          <p className="mt-1 text-xl font-semibold text-emerald-700">
            {formatCurrency(rev.estimated_profit)}
          </p>
        </div>
      </div>

      {/* Daily / Weekly / Monthly Sales Chart + Category-Wise Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Sales &amp; Revenue Report ({granularity})
              </h2>
              <p className="text-xs text-slate-500">
                Switch between daily, weekly, and monthly breakdowns
              </p>
            </div>
            <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs">
              {['daily', 'weekly', 'monthly'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setGranularity(mode)}
                  className={`rounded px-2.5 py-1 capitalize font-medium ${
                    granularity === mode
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {activeSalesSeries.length === 0 ? (
            <p className="py-16 text-center text-xs text-slate-500">
              No sales data in the selected date range.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeSalesSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val) => [formatCurrency(val), 'Revenue']}
                    contentStyle={{ fontSize: '12px', borderRadius: '6px' }}
                  />
                  <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Category-wise Sales</h2>
          <p className="text-xs text-slate-500 mb-4">Revenue share across categories</p>

          {(data?.categoryWiseSales || []).length === 0 ? (
            <p className="py-16 text-center text-xs text-slate-500">
              No category sales in selected range.
            </p>
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.categoryWiseSales}
                      dataKey="revenue"
                      nameKey="category_name"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {data.categoryWiseSales.map((c, idx) => (
                        <Cell key={c.category_name} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => formatCurrency(val)}
                      contentStyle={{ fontSize: '12px', borderRadius: '6px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
                {data.categoryWiseSales.map((c) => (
                  <div key={c.category_name} className="flex justify-between">
                    <span className="text-slate-600">
                      {c.category_name} ({c.units_sold} qty)
                    </span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(c.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Best-selling products & Inventory Valuation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Best-Selling Products</h2>
          <p className="text-xs text-slate-500 mb-4">Top products by units sold</p>
          {(data?.bestSellingProducts || []).length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              No product sales in the selected range.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-2 font-medium">Product</th>
                    <th className="pb-2 text-right font-medium">Units Sold</th>
                    <th className="pb-2 text-right font-medium">Revenue</th>
                    <th className="pb-2 text-right font-medium">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.bestSellingProducts.map((p) => (
                    <tr key={p.sku}>
                      <td className="py-2.5">
                        <div className="font-medium text-slate-900">{p.product_name}</div>
                        <div className="font-mono text-[11px] text-slate-400">{p.sku}</div>
                      </td>
                      <td className="py-2.5 text-right font-semibold text-slate-800">
                        {p.units_sold}
                      </td>
                      <td className="py-2.5 text-right text-slate-900">
                        {formatCurrency(p.total_revenue)}
                      </td>
                      <td className="py-2.5 text-right text-emerald-700 font-medium">
                        {formatCurrency(p.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Inventory Valuation</h2>
          <p className="text-xs text-slate-500 mb-4">
            Cost Value: <span className="font-semibold text-slate-800">{formatCurrency(valuation.totals.totalCostValue)}</span> · Retail Value:{' '}
            <span className="font-semibold text-blue-700">{formatCurrency(valuation.totals.totalRetailValue)}</span>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 text-right font-medium">Units</th>
                  <th className="pb-2 text-right font-medium">Cost Value</th>
                  <th className="pb-2 text-right font-medium">Retail Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {valuation.byCategory.map((row) => (
                  <tr key={row.category_name}>
                    <td className="py-2.5 font-medium text-slate-900">{row.category_name}</td>
                    <td className="py-2.5 text-right text-slate-700">{row.total_units}</td>
                    <td className="py-2.5 text-right text-slate-600">
                      {formatCurrency(row.cost_value)}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-slate-900">
                      {formatCurrency(row.retail_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Low Stock Report */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Low-Stock Report</h2>
            <p className="text-xs text-slate-500">
              Products currently at or below their minimum stock threshold
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportLowStockCsv}
            className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>

        {(data?.lowStockReport || []).length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">
            No low-stock or out-of-stock products at this time.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-2 font-medium">SKU</th>
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Supplier</th>
                  <th className="pb-2 text-right font-medium">Available</th>
                  <th className="pb-2 text-right font-medium">Min Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.lowStockReport.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 font-mono text-slate-600">{item.sku}</td>
                    <td className="py-2 font-medium text-slate-900">{item.name}</td>
                    <td className="py-2 text-slate-600">{item.category_name}</td>
                    <td className="py-2 text-slate-600">{item.supplier_name}</td>
                    <td
                      className={`py-2 text-right font-semibold ${
                        item.available_quantity === 0 ? 'text-rose-600' : 'text-amber-700'
                      }`}
                    >
                      {item.available_quantity}
                    </td>
                    <td className="py-2 text-right text-slate-600">{item.min_stock_level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
