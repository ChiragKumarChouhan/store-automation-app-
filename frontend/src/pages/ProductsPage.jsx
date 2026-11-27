import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Edit2, Eye, FolderPlus, Package, Plus, Search, Trash2 } from 'lucide-react';
import { categoryService, productService, supplierService } from '../services/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import Pagination from '../components/common/Pagination.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Modal from '../components/common/Modal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import { StockStatusBadge } from '../components/common/StatusBadge.jsx';
import ProductFormModal from '../components/products/ProductFormModal.jsx';

export default function ProductsPage() {
  const { isAdmin, formatCurrency } = useAuth();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState('catalog');
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [categoryId, setCategoryId] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [detailProduct, setDetailProduct] = useState(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [categorySaving, setCategorySaving] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(null);

  const loadCategoriesAndSuppliers = useCallback(async () => {
    try {
      const [catRes, supRes] = await Promise.all([
        categoryService.list(),
        supplierService.list(),
      ]);
      setCategories(catRes.data || []);
      setSuppliers(supRes.data || []);
    } catch {
      // handled on main fetch
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productService.list({
        search,
        category_id: categoryId,
        stock_status: stockStatus,
        page,
        limit: 10,
      });
      setProducts(res.data.items);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error(err.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, stockStatus, page, toast]);

  useEffect(() => {
    setSearch(searchParams.get('search') || '');
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    loadCategoriesAndSuppliers();
  }, [loadCategoriesAndSuppliers]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const viewProductDetail = async (id) => {
    try {
      const res = await productService.getById(id);
      setDetailProduct(res.data);
    } catch (err) {
      toast.error(err.message || 'Failed to load product details.');
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    setDeleteLoading(true);
    try {
      await productService.remove(deletingProduct.id);
      toast.success('Product deleted successfully.');
      setDeletingProduct(null);
      loadProducts();
      loadCategoriesAndSuppliers();
    } catch (err) {
      toast.error(err.message || 'Failed to delete product.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      toast.error('Category name is required.');
      return;
    }
    setCategorySaving(true);
    try {
      if (editingCategory) {
        await categoryService.update(editingCategory.id, categoryForm);
        toast.success('Category updated successfully.');
      } else {
        await categoryService.create(categoryForm);
        toast.success('Category created successfully.');
      }
      setCategoryModalOpen(false);
      loadCategoriesAndSuppliers();
      loadProducts();
    } catch (err) {
      toast.error(err.message || 'Failed to save category.');
    } finally {
      setCategorySaving(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    setDeleteLoading(true);
    try {
      await categoryService.remove(deletingCategory.id);
      toast.success('Category deleted successfully.');
      setDeletingCategory(null);
      loadCategoriesAndSuppliers();
    } catch (err) {
      toast.error(err.message || 'Failed to delete category.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Product Management</h1>
          <p className="text-sm text-slate-500">
            Manage store product catalog, pricing, descriptions, and categories.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && tab === 'categories' && (
            <button
              type="button"
              onClick={() => {
                setEditingCategory(null);
                setCategoryForm({ name: '', description: '' });
                setCategoryModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-700"
            >
              <FolderPlus className="h-4 w-4" />
              Add Category
            </button>
          )}
          {isAdmin && tab === 'catalog' && (
            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setProductModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('catalog')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            tab === 'catalog'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Product Catalog
        </button>
        <button
          type="button"
          onClick={() => setTab('categories')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            tab === 'categories'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Categories ({categories.length})
        </button>
      </div>

      {tab === 'catalog' ? (
        <>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by product name, SKU, or description..."
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
                <option value="">All Availability</option>
                <option value="available">Available (&gt; 0)</option>
                <option value="in_stock">Healthy Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            {loading ? (
              <LoadingSpinner label="Loading products..." />
            ) : products.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No products match your search"
                description="Reset filters or add a new product to the catalog."
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                        <th className="pb-3 pr-3 font-medium">SKU</th>
                        <th className="pb-3 pr-3 font-medium">Product Name</th>
                        <th className="pb-3 pr-3 font-medium">Category</th>
                        <th className="pb-3 pr-3 font-medium">Purchase Price</th>
                        <th className="pb-3 pr-3 font-medium">Selling Price</th>
                        <th className="pb-3 pr-3 font-medium">Availability</th>
                        <th className="pb-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/70">
                          <td className="py-3 pr-3 font-mono text-xs text-slate-700">{p.sku}</td>
                          <td className="py-3 pr-3">
                            <div className="font-medium text-slate-900">{p.name}</div>
                            <div className="text-xs text-slate-500 truncate max-w-xs">
                              {p.description || 'No description'}
                            </div>
                          </td>
                          <td className="py-3 pr-3 text-slate-600">{p.category_name}</td>
                          <td className="py-3 pr-3 text-slate-600">
                            {formatCurrency(p.purchase_price)}
                          </td>
                          <td className="py-3 pr-3 font-semibold text-slate-900">
                            {formatCurrency(p.selling_price)}
                          </td>
                          <td className="py-3 pr-3">
                            <div className="flex items-center gap-2">
                              <StockStatusBadge status={p.stock_status} />
                              <span className="text-xs text-slate-500">
                                ({p.available_quantity})
                              </span>
                            </div>
                          </td>
                          <td className="py-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => viewProductDetail(p.id)}
                                title="View Details"
                                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {isAdmin && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingProduct(p);
                                      setProductModalOpen(true);
                                    }}
                                    title="Edit Product"
                                    className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingProduct(p)}
                                    title="Delete Product"
                                    className="rounded p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
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
                  onPageChange={setPage}
                />
              </>
            )}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="rounded-lg border border-slate-200 bg-white p-4 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{cat.name}</h3>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {cat.product_count} products
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  {cat.description || 'No description provided.'}
                </p>
              </div>
              {isAdmin && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(cat);
                      setCategoryForm({ name: cat.name, description: cat.description || '' });
                      setCategoryModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingCategory(cat)}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Product Detail Modal */}
      <Modal
        isOpen={Boolean(detailProduct)}
        onClose={() => setDetailProduct(null)}
        title={detailProduct?.name || 'Product Details'}
        subtitle={detailProduct ? `SKU: ${detailProduct.sku} · ID #${detailProduct.id}` : ''}
        size="lg"
      >
        {detailProduct && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-md bg-slate-50 p-3 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500">Purchase Price</span>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {formatCurrency(detailProduct.purchase_price)}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Selling Price</span>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {formatCurrency(detailProduct.selling_price)}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Unit Margin</span>
                <p className="font-semibold text-emerald-700 mt-0.5">
                  {formatCurrency(detailProduct.selling_price - detailProduct.purchase_price)}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Stock Available</span>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {detailProduct.available_quantity} (Min {detailProduct.min_stock_level})
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-slate-500">Category</span>
                <p className="font-medium text-slate-900">{detailProduct.category_name}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Supplier</span>
                <p className="font-medium text-slate-900">{detailProduct.supplier_name}</p>
                {detailProduct.supplier_phone && (
                  <p className="text-xs text-slate-500">{detailProduct.supplier_phone}</p>
                )}
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-500">Description</span>
              <p className="mt-1 text-sm text-slate-700">
                {detailProduct.description || 'No description available.'}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Recent Stock History
              </h4>
              {detailProduct.movements?.length === 0 ? (
                <p className="text-xs text-slate-500">No stock movements recorded.</p>
              ) : (
                <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-100 text-xs">
                  {detailProduct.movements.map((m) => (
                    <div key={m.id} className="flex items-center justify-between px-3 py-2">
                      <div>
                        <span className="font-medium text-slate-800">{m.movement_type}</span>
                        <span className="text-slate-500"> · {m.notes}</span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-semibold ${
                            m.quantity_change > 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                        </span>
                        <span className="text-slate-400 ml-2">Bal: {m.new_quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ProductFormModal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        product={editingProduct}
        categories={categories}
        suppliers={suppliers}
        onSuccess={() => {
          loadProducts();
          loadCategoriesAndSuppliers();
        }}
      />

      {/* Category Modal */}
      <Modal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        size="sm"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={categoryForm.description}
              onChange={(e) =>
                setCategoryForm({ ...categoryForm, description: e.target.value })
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCategoryModalOpen(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={categorySaving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {categorySaving ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deletingProduct)}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDeleteProduct}
        loading={deleteLoading}
        title="Delete Product"
        message={
          deletingProduct
            ? `Delete "${deletingProduct.name}" (${deletingProduct.sku})?`
            : ''
        }
      />

      <ConfirmDialog
        isOpen={Boolean(deletingCategory)}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDeleteCategory}
        loading={deleteLoading}
        title="Delete Category"
        message={
          deletingCategory
            ? `Delete category "${deletingCategory.name}"? Categories with assigned products cannot be deleted.`
            : ''
        }
      />
    </div>
  );
}
