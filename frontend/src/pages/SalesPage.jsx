import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Eye,
  Minus,
  Plus,
  Printer,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { customerService, productService, salesService } from '../services/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import Pagination from '../components/common/Pagination.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Modal from '../components/common/Modal.jsx';

function generateIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `sale-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function SalesPage() {
  const { isAdmin, storeSettings, formatCurrency } = useAuth();
  const toast = useToast();
  const canCreateSale = isAdmin || Boolean(storeSettings?.student_can_create_sales);

  const [tab, setTab] = useState(canCreateSale ? 'billing' : 'history');

  // POS / Billing state
  const [catalog, setCatalog] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [cart, setCart] = useState([]);
  const [discountType, setDiscountType] = useState('flat');
  const [discountValue, setDiscountValue] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyKey);
  const [submittingSale, setSubmittingSale] = useState(false);

  // History state
  const [sales, setSales] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [historySearch, setHistorySearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Invoice detail modal
  const [activeInvoice, setActiveInvoice] = useState(null);

  const loadBillingCatalog = useCallback(async () => {
    try {
      const [prodRes, custRes] = await Promise.all([
        productService.list({ limit: 100, sort_by: 'name', sort_order: 'asc' }),
        customerService.list({ limit: 100 }),
      ]);
      setCatalog(prodRes.data.items || []);
      setCustomers(custRes.data.items || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load billing catalog.');
    }
  }, [toast]);

  const loadSalesHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await salesService.list({
        search: historySearch,
        payment_method: paymentFilter,
        start_date: startDate,
        end_date: endDate,
        page: historyPage,
        limit: 10,
      });
      setSales(res.data.items || []);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error(err.message || 'Failed to load sales history.');
    } finally {
      setHistoryLoading(false);
    }
  }, [historySearch, paymentFilter, startDate, endDate, historyPage, toast]);

  useEffect(() => {
    loadBillingCatalog();
  }, [loadBillingCatalog]);

  useEffect(() => {
    if (tab === 'history') {
      loadSalesHistory();
    }
  }, [tab, loadSalesHistory]);

  const filteredCatalog = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category_name.toLowerCase().includes(q)
    );
  }, [catalog, productSearch]);

  const addToCart = (product) => {
    if (product.available_quantity <= 0) {
      toast.error(`"${product.name}" is out of stock.`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.available_quantity) {
          toast.error(`Maximum available stock (${product.available_quantity}) reached.`);
          return prev;
        }
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          unit_price: product.selling_price,
          max_stock: product.available_quantity,
          quantity: 1,
        },
      ];
    });
  };

  const updateCartQty = (productId, nextQty) => {
    const qty = parseInt(nextQty, 10);
    if (Number.isNaN(qty) || qty <= 0) {
      setCart((prev) => prev.filter((item) => item.product_id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product_id !== productId) return item;
        if (qty > item.max_stock) {
          toast.error(`Only ${item.max_stock} units available for "${item.name}".`);
          return { ...item, quantity: item.max_stock };
        }
        return { ...item, quantity: qty };
      })
    );
  };

  const subtotal = useMemo(
    () =>
      Number(
        cart
          .reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
          .toFixed(2)
      ),
    [cart]
  );

  const discountValNum = Math.max(0, Number(discountValue) || 0);
  const discountAmount = useMemo(() => {
    if (discountType === 'percent') {
      const pct = Math.min(100, discountValNum);
      return Number(((subtotal * pct) / 100).toFixed(2));
    }
    return Number(Math.min(subtotal, discountValNum).toFixed(2));
  }, [subtotal, discountType, discountValNum]);

  const taxRate = Number(storeSettings?.default_tax_rate || 0);
  const taxableAmount = Number((subtotal - discountAmount).toFixed(2));
  const taxAmount = Number(((taxableAmount * taxRate) / 100).toFixed(2));
  const finalAmount = Number((taxableAmount + taxAmount).toFixed(2));

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!canCreateSale) {
      toast.error('You do not have permission to create sales transactions.');
      return;
    }
    if (cart.length === 0) {
      toast.error('Add at least one product to create a sale.');
      return;
    }
    if (discountType === 'percent' && discountValNum > 100) {
      toast.error('Percentage discount cannot exceed 100%.');
      return;
    }
    if (discountType === 'flat' && discountValNum > subtotal) {
      toast.error('Flat discount cannot exceed subtotal.');
      return;
    }

    setSubmittingSale(true);
    try {
      const res = await salesService.create({
        customer_id: selectedCustomerId ? Number(selectedCustomerId) : null,
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
        discount_type: discountType,
        discount_value: discountValNum,
        payment_method: paymentMethod,
        notes,
        idempotency_key: idempotencyKey,
      });

      toast.success(res.message || 'Invoice created successfully.');
      setActiveInvoice(res.data);
      setCart([]);
      setDiscountValue('0');
      setNotes('');
      setSelectedCustomerId('');
      setIdempotencyKey(generateIdempotencyKey());
      loadBillingCatalog();
      loadSalesHistory();
    } catch (err) {
      toast.error(err.message || 'Failed to complete sale.');
    } finally {
      setSubmittingSale(false);
    }
  };

  const viewInvoice = async (saleId) => {
    try {
      const res = await salesService.getById(saleId);
      setActiveInvoice(res.data);
    } catch (err) {
      toast.error(err.message || 'Failed to load invoice details.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Sales &amp; Billing</h1>
          <p className="text-sm text-slate-500">
            Create customer invoices with automatic inventory deduction and view transaction history.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 no-print">
        {canCreateSale && (
          <button
            type="button"
            onClick={() => setTab('billing')}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              tab === 'billing'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            New Sale / Billing
          </button>
        )}
        <button
          type="button"
          onClick={() => setTab('history')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            tab === 'history'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Transaction History
        </button>
      </div>

      {!canCreateSale && tab === 'billing' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Student sales creation is currently disabled by the administrator in Settings. You can still view sales history.
        </div>
      )}

      {tab === 'billing' && canCreateSale ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 no-print">
          {/* Product Picker */}
          <div className="lg:col-span-7 rounded-lg border border-slate-200 bg-white p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">Select Products</h2>
              <span className="text-xs text-slate-500">{filteredCatalog.length} items</span>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products by name, SKU, or category..."
                className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
              {filteredCatalog.map((prod) => {
                const out = prod.available_quantity <= 0;
                return (
                  <button
                    key={prod.id}
                    type="button"
                    disabled={out}
                    onClick={() => addToCart(prod)}
                    className={`flex flex-col justify-between rounded-md border p-3 text-left transition-colors ${
                      out
                        ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                        : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/30'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-slate-900">{prod.name}</span>
                        <span className="text-sm font-semibold text-blue-700 shrink-0">
                          {formatCurrency(prod.selling_price)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs font-mono text-slate-500">{prod.sku}</p>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-xs">
                      <span className="text-slate-500">{prod.category_name}</span>
                      <span
                        className={`font-medium ${
                          out
                            ? 'text-rose-600'
                            : prod.available_quantity <= prod.min_stock_level
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {out ? 'Out of stock' : `${prod.available_quantity} in stock`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Billing Cart */}
          <form
            onSubmit={handleCheckout}
            className="lg:col-span-5 rounded-lg border border-slate-200 bg-white p-4 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                  <h2 className="text-sm font-semibold text-slate-900">Current Invoice</h2>
                </div>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Clear Cart
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Customer
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                >
                  <option value="">Walk-in Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              {cart.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 py-10 text-center text-xs text-slate-500">
                  Select products from the left panel to add items to this invoice.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto border border-slate-200 rounded-md px-3">
                  {cart.map((item) => (
                    <div key={item.product_id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-900">{item.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {formatCurrency(item.unit_price)} × {item.quantity} ={' '}
                          <span className="font-semibold text-slate-800">
                            {formatCurrency(item.unit_price * item.quantity)}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.product_id, item.quantity - 1)}
                          className="rounded border border-slate-300 p-1 text-slate-600 hover:bg-slate-100"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={item.max_stock}
                          value={item.quantity}
                          onChange={(e) => updateCartQty(item.product_id, e.target.value)}
                          className="w-12 rounded border border-slate-300 py-0.5 text-center text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.product_id, item.quantity + 1)}
                          className="rounded border border-slate-300 p-1 text-slate-600 hover:bg-slate-100"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.product_id, 0)}
                          className="rounded p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Discount
                  </label>
                  <div className="flex">
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                      className="rounded-l-md border border-r-0 border-slate-300 bg-slate-50 px-2 py-2 text-xs focus:outline-none"
                    >
                      <option value="flat">{storeSettings?.currency_symbol || '₹'}</option>
                      <option value="percent">%</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-full rounded-r-md border border-slate-300 px-2.5 py-2 text-sm focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Invoice Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional reference or remarks"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Discount</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
              {taxRate > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax ({taxRate}%)</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
                <span>Final Amount</span>
                <span>{formatCurrency(finalAmount)}</span>
              </div>

              <button
                type="submit"
                disabled={submittingSale || cart.length === 0}
                className="mt-3 w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submittingSale ? 'Processing Sale...' : 'Complete Sale & Generate Invoice'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Transaction History Tab */
        <div className="space-y-4 no-print">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setHistoryPage(1);
                  }}
                  placeholder="Search invoice # or customer..."
                  className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
              <select
                value={paymentFilter}
                onChange={(e) => {
                  setPaymentFilter(e.target.value);
                  setHistoryPage(1);
                }}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                <option value="">All Payment Methods</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setHistoryPage(1);
                }}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setHistoryPage(1);
                }}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            {historyLoading ? (
              <LoadingSpinner label="Loading transactions..." />
            ) : sales.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No invoices found"
                description="No sales transactions match the selected filters."
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                        <th className="pb-3 pr-3 font-medium">Invoice #</th>
                        <th className="pb-3 pr-3 font-medium">Date</th>
                        <th className="pb-3 pr-3 font-medium">Customer</th>
                        <th className="pb-3 pr-3 font-medium">Billed By</th>
                        <th className="pb-3 pr-3 font-medium">Items</th>
                        <th className="pb-3 pr-3 font-medium">Payment</th>
                        <th className="pb-3 pr-3 text-right font-medium">Total</th>
                        <th className="pb-3 text-right font-medium">Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sales.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/70">
                          <td className="py-3 pr-3 font-mono font-medium text-slate-900">
                            {s.invoice_number}
                          </td>
                          <td className="py-3 pr-3 text-xs text-slate-600">
                            {new Date(s.sale_date).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 pr-3 text-slate-800">{s.customer_name}</td>
                          <td className="py-3 pr-3 text-slate-600">{s.sold_by_name}</td>
                          <td className="py-3 pr-3 text-slate-600">{s.total_items}</td>
                          <td className="py-3 pr-3 text-slate-600">{s.payment_method}</td>
                          <td className="py-3 pr-3 text-right font-semibold text-slate-900">
                            {formatCurrency(s.total_amount)}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => viewInvoice(s.id)}
                              className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Eye className="h-3.5 w-3.5" /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  onPageChange={setHistoryPage}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Printable Invoice Modal */}
      <Modal
        isOpen={Boolean(activeInvoice)}
        onClose={() => setActiveInvoice(null)}
        title={`Invoice ${activeInvoice?.invoice_number || ''}`}
        subtitle={
          activeInvoice
            ? `Issued on ${new Date(activeInvoice.sale_date).toLocaleString('en-IN')}`
            : ''
        }
        size="lg"
      >
        {activeInvoice && (
          <div className="space-y-5">
            <div className="printable-invoice space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {storeSettings?.store_name || 'Store Automation'}
                  </h3>
                  <p className="text-xs font-medium text-blue-700">
                    {storeSettings?.institution_name || 'ABESEC Ghaziabad'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{storeSettings?.address}</p>
                  <p className="text-xs text-slate-500">
                    {storeSettings?.phone} · {storeSettings?.email}
                  </p>
                </div>
                <div className="sm:text-right text-xs">
                  <div className="text-sm font-semibold text-slate-900">
                    {activeInvoice.invoice_number}
                  </div>
                  <div className="text-slate-500 mt-1">
                    Date: {new Date(activeInvoice.sale_date).toLocaleString('en-IN')}
                  </div>
                  <div className="text-slate-500">
                    Payment: {activeInvoice.payment_method}
                  </div>
                  <div className="text-slate-500">
                    Cashier: {activeInvoice.sold_by_name}
                  </div>
                </div>
              </div>

              <div className="rounded-md bg-slate-50 p-3 text-xs border border-slate-200">
                <span className="font-semibold text-slate-700">Billed To: </span>
                <span className="text-slate-900">{activeInvoice.customer_name}</span>
                {activeInvoice.customer_phone && (
                  <span className="text-slate-500"> · {activeInvoice.customer_phone}</span>
                )}
                {activeInvoice.customer_address && (
                  <p className="text-slate-500 mt-0.5">{activeInvoice.customer_address}</p>
                )}
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 font-medium">#</th>
                    <th className="py-2 font-medium">Product</th>
                    <th className="py-2 font-medium">SKU</th>
                    <th className="py-2 text-right font-medium">Qty</th>
                    <th className="py-2 text-right font-medium">Unit Price</th>
                    <th className="py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeInvoice.items?.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="py-2 text-slate-500">{idx + 1}</td>
                      <td className="py-2 font-medium text-slate-900">{item.product_name}</td>
                      <td className="py-2 font-mono text-slate-500">{item.sku}</td>
                      <td className="py-2 text-right text-slate-700">{item.quantity}</td>
                      <td className="py-2 text-right text-slate-700">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="py-2 text-right font-medium text-slate-900">
                        {formatCurrency(item.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>{formatCurrency(activeInvoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(activeInvoice.discount_amount)}</span>
                  </div>
                  {Number(activeInvoice.tax_amount) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tax ({activeInvoice.tax_rate}%)</span>
                      <span>{formatCurrency(activeInvoice.tax_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-300 pt-1.5 text-sm font-bold text-slate-900">
                    <span>Grand Total</span>
                    <span>{formatCurrency(activeInvoice.total_amount)}</span>
                  </div>
                </div>
              </div>

              {activeInvoice.notes && (
                <p className="text-xs text-slate-500 border-t border-slate-100 pt-2">
                  Notes: {activeInvoice.notes}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-3 no-print">
              <button
                type="button"
                onClick={() => setActiveInvoice(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Printer className="h-4 w-4" />
                Print Invoice
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
