import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpDown,
  Boxes,
  Edit2,
  History,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import {
  categoryService,
  inventoryService,
  productService,
  supplierService,
} from '../services/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import Pagination from '../components/common/Pagination.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Modal from '../components/common/Modal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import { StockStatusBadge } from '../components/common/StatusBadge.jsx';
import ProductFormModal from '../components/products/ProductFormModal.jsx';

export default function InventoryPage() {
  const { isAdmin, formatCurrency } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [movements, setMovements] = useState([]);

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [stockStatus, setStockStatus] = useState(searchParams.get('stock_status') || '');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustForm, setAdjustForm] = useState({
    movement_type: 'IN',
    quantity: '',
    min_stock_level: '',
    notes: '',
  });
  const [adjustSaving, setAdjustSaving] = useState(false);

  const [movementsModalOpen, setMovementsModalOpen] = useState(false);

  const loadMetadata = useCallback(async () => {
    try {
      const [catRes, supRes, sumRes] = await Promise.all([
        categoryService.list(),
        supplierService.list(),
        inventoryService.summary(),
      ]);
      setCategories(catRes.data || []);
      setSuppliers(supRes.data || []);
      setSummary(sumRes.data || null);
    } catch {
      // Handled by main loader if network fails
    }
  }, []);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productService.list({
        search,
        category_id: categoryId,
        stock_status: stockStatus,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        limit: 10,
      });
      setItems(res.data.items);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error(err.message || 'Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, stockStatus, sortBy, sortOrder, page, toast]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const openMovements = async () => {
    setMovementsModalOpen(true);
    try {
      const res = await inventoryService.movements(30);
      setMovements(res.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load stock movements.');
    }
  };

  const openAdjustModal = (item) => {
    setAdjustTarget(item);
    setAdjustForm({
      movement_type: 'IN',
      quantity: '',
      min_stock_level: String(item.min_stock_level),
      notes: '',
    });
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    const qty = Number(adjustForm.quantity);
    if (
      adjustForm.quantity === '' ||
      !Number.isInteger(qty) ||
      qty < 0 ||
      (adjustForm.movement_type !== 'ADJUSTMENT' && qty === 0)
    ) {
      toast.error('Please enter a valid whole number quantity.');
      return;
    }

    setAdjustSaving(true);
    try {
      await inventoryService.adjust(adjustTarget.id, {
        movement_type: adjustForm.movement_type,
        quantity: qty,
        min_stock_level: Number(adjustForm.min_stock_level),
        notes: adjustForm.notes,
      });
      toast.success('Stock level adjusted successfully.');
      setAdjustTarget(null);
      loadInventory();
      loadMetadata();
    } catch (err) {
      toast.error(err.message || 'Failed to adjust stock.');
    } finally {
      setAdjustSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    setDeleteLoading(true);
    try {
      await productService.remove(deletingProduct.id);
      toast.success(`Deleted "${deletingProduct.name}".`);
      setDeletingProduct(null);
      loadInventory();
      loadMetadata();
    } catch (err) {
      toast.error(err.message || 'Failed to delete product.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleSort = (col) => {
    if (sortBy === col) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Inventory Management</h1>
          <p className="text-sm text-slate-500">
            Monitor stock quantities, minimum thresholds, and stock movements.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openMovements}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <History className="h-4 w-4" />
            Stock Movements
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setFormModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          )}
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500 font-medium">Total SKUs</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{summary.totalSkus}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500 font-medium">Units Available</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{summary.totalUnits}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500 font-medium">Low / Out of Stock</p>
            <p className="mt-1 text-xl font-semibold text-amber-600">
              {summary.lowStockCount} low · {summary.outOfStockCount} out
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500 font-medium">Stock Retail Value</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {formatCurrency(summary.retailValuation)}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name or SKU..."
              className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={stockStatus}
            onChange={(e) => {
              setStockStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          >
            <option value="">All Stock Statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>

          <select
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => {
              const [col, ord] = e.target.value.split(':');
              setSortBy(col);
              setSortOrder(ord);
              setPage(1);
            }}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
          >
            <option value="created_at:desc">Newest Added</option>
            <option value="name:asc">Name (A-Z)</option>
            <option value="available_quantity:asc">Stock (Low to High)</option>
            <option value="available_quantity:desc">Stock (High to Low)</option>
            <option value="selling_price:desc">Price (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        {loading ? (
          <LoadingSpinner label="Loading inventory records..." />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No inventory items found"
            description="Try adjusting your search or filter criteria."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                    <th className="pb-3 pr-3 font-medium">ID / SKU</th>
                    <th className="pb-3 pr-3 font-medium">
                      <button
                        type="button"
                        onClick={() => toggleSort('name')}
                        className="inline-flex items-center gap-1 hover:text-slate-800"
                      >
                        Product <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="pb-3 pr-3 font-medium">Category</th>
                    <th className="pb-3 pr-3 font-medium">Supplier</th>
                    <th className="pb-3 pr-3 font-medium">Buy / Sell</th>
                    <th className="pb-3 pr-3 font-medium">
                      <button
                        type="button"
                        onClick={() => toggleSort('available_quantity')}
                        className="inline-flex items-center gap-1 hover:text-slate-800"
                      >
                        Stock <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="pb-3 pr-3 font-medium">Status</th>
                    <th className="pb-3 pr-3 font-medium">Date Added</th>
                    {isAdmin && <th className="pb-3 text-right font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="py-3 pr-3">
                        <div className="text-xs text-slate-400">#{item.id}</div>
                        <div className="font-mono text-xs font-medium text-slate-800">
                          {item.sku}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="font-medium text-slate-900">{item.name}</div>
                        {item.stock_status !== 'in_stock' && (
                          <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-amber-700">
                            <AlertTriangle className="h-3 w-3" />
                            {item.stock_status === 'out_of_stock'
                              ? 'Restock immediately'
                              : `Below min (${item.min_stock_level})`}
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-slate-600">{item.category_name}</td>
                      <td className="py-3 pr-3 text-slate-600">{item.supplier_name}</td>
                      <td className="py-3 pr-3">
                        <div className="text-xs text-slate-500">
                          Buy: {formatCurrency(item.purchase_price)}
                        </div>
                        <div className="font-medium text-slate-900">
                          Sell: {formatCurrency(item.selling_price)}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="font-semibold text-slate-900">
                          {item.available_quantity}
                        </span>
                        <span className="text-xs text-slate-400"> / min {item.min_stock_level}</span>
                      </td>
                      <td className="py-3 pr-3">
                        <StockStatusBadge status={item.stock_status} />
                      </td>
                      <td className="py-3 pr-3 text-xs text-slate-500">
                        {new Date(item.created_at).toLocaleDateString('en-IN')}
                      </td>
                      {isAdmin && (
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openAdjustModal(item)}
                              title="Adjust Stock"
                              className="rounded p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                            >
                              <SlidersHorizontal className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProduct(item);
                                setFormModalOpen(true);
                              }}
                              title="Edit Product"
                              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingProduct(item)}
                              title="Delete Product"
                              className="rounded p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      <ProductFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        product={editingProduct}
        categories={categories}
        suppliers={suppliers}
        onSuccess={() => {
          loadInventory();
          loadMetadata();
        }}
      />

      {/* Quick Stock Adjustment Modal */}
      <Modal
        isOpen={Boolean(adjustTarget)}
        onClose={() => setAdjustTarget(null)}
        title="Adjust Stock Level"
        subtitle={
          adjustTarget
            ? `${adjustTarget.name} (${adjustTarget.sku}) · Current: ${adjustTarget.available_quantity}`
            : ''
        }
        size="sm"
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Movement Type
            </label>
            <select
              value={adjustForm.movement_type}
              onChange={(e) => setAdjustForm({ ...adjustForm, movement_type: e.target.value })}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            >
              <option value="IN">Stock In (+ Add Units)</option>
              <option value="OUT">Stock Out (- Remove Units)</option>
              <option value="ADJUSTMENT">Set Exact Quantity</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {adjustForm.movement_type === 'ADJUSTMENT' ? 'New Total Quantity *' : 'Quantity *'}
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={adjustForm.quantity}
              onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Minimum Stock Alert Level
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={adjustForm.min_stock_level}
              onChange={(e) =>
                setAdjustForm({ ...adjustForm, min_stock_level: e.target.value })
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
            <input
              type="text"
              value={adjustForm.notes}
              onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
              placeholder="e.g. Supplier restock delivery"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setAdjustTarget(null)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adjustSaving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {adjustSaving ? 'Saving...' : 'Apply Adjustment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Stock Movements Modal */}
      <Modal
        isOpen={movementsModalOpen}
        onClose={() => setMovementsModalOpen(false)}
        title="Recent Stock Movements"
        subtitle="Audit trail of inventory additions, adjustments, and sales deductions"
        size="xl"
      >
        {movements.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No movements recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Change</th>
                  <th className="pb-2 font-medium">Prev → New</th>
                  <th className="pb-2 font-medium">Notes</th>
                  <th className="pb-2 font-medium">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2 text-slate-500">
                      {new Date(m.created_at).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 font-medium text-slate-900">
                      {m.product_name}{' '}
                      <span className="font-mono text-slate-400">({m.sku})</span>
                    </td>
                    <td className="py-2">{m.movement_type}</td>
                    <td
                      className={`py-2 font-semibold ${
                        m.quantity_change > 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                    </td>
                    <td className="py-2 text-slate-600">
                      {m.previous_quantity} → {m.new_quantity}
                    </td>
                    <td className="py-2 text-slate-600">{m.notes}</td>
                    <td className="py-2 text-slate-600">{m.actor_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deletingProduct)}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete Product"
        message={
          deletingProduct
            ? `Are you sure you want to delete "${deletingProduct.name}" (${deletingProduct.sku})? Existing historical invoices will remain intact.`
            : ''
        }
      />
    </div>
  );
}
