import { useEffect, useState } from 'react';
import Modal from '../common/Modal.jsx';
import { productService } from '../../services/index.js';
import { useToast } from '../../context/ToastContext.jsx';

const INITIAL_FORM = {
  name: '',
  sku: '',
  category_id: '',
  supplier_id: '',
  description: '',
  purchase_price: '',
  selling_price: '',
  available_quantity: '0',
  min_stock_level: '5',
};

export default function ProductFormModal({
  isOpen,
  onClose,
  product,
  categories,
  suppliers,
  onSuccess,
}) {
  const toast = useToast();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (product) {
      setForm({
        name: product.name || '',
        sku: product.sku || '',
        category_id: product.category_id ? String(product.category_id) : '',
        supplier_id: product.supplier_id ? String(product.supplier_id) : '',
        description: product.description || '',
        purchase_price: String(product.purchase_price ?? ''),
        selling_price: String(product.selling_price ?? ''),
        available_quantity: String(product.available_quantity ?? '0'),
        min_stock_level: String(product.min_stock_level ?? '5'),
      });
    } else {
      setForm(INITIAL_FORM);
    }
    setErrors({});
  }, [isOpen, product]);

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Product name is required.';
    if (!form.sku.trim()) next.sku = 'SKU is required.';
    const buy = Number(form.purchase_price);
    const sell = Number(form.selling_price);
    const qty = Number(form.available_quantity);
    const min = Number(form.min_stock_level);

    if (form.purchase_price === '' || Number.isNaN(buy) || buy < 0) {
      next.purchase_price = 'Enter a valid non-negative purchase price.';
    }
    if (form.selling_price === '' || Number.isNaN(sell) || sell < 0) {
      next.selling_price = 'Enter a valid non-negative selling price.';
    }
    if (!Number.isInteger(qty) || qty < 0) {
      next.available_quantity = 'Enter a non-negative whole number.';
    }
    if (!Number.isInteger(min) || min < 0) {
      next.min_stock_level = 'Enter a non-negative whole number.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        ...form,
        category_id: form.category_id ? Number(form.category_id) : null,
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
        purchase_price: Number(form.purchase_price),
        selling_price: Number(form.selling_price),
        available_quantity: Number(form.available_quantity),
        min_stock_level: Number(form.min_stock_level),
      };

      if (product) {
        await productService.update(product.id, payload);
        toast.success('Product updated successfully.');
      } else {
        await productService.create(payload);
        toast.success('Product created successfully.');
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'Edit Product' : 'Add New Product'}
      subtitle={product ? `Updating ${product.sku}` : 'Create a new product and initialize inventory'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              placeholder="e.g. Logitech M185 Mouse"
            />
            {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              SKU *
            </label>
            <input
              type="text"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-none"
              placeholder="e.g. SKU-ELC-105"
            />
            {errors.sku && <p className="mt-1 text-xs text-rose-600">{errors.sku}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            >
              <option value="">Uncategorized</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Supplier</label>
            <select
              value={form.supplier_id}
              onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            >
              <option value="">Unassigned</option>
              {suppliers.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Purchase Price *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.purchase_price}
              onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
            {errors.purchase_price && (
              <p className="mt-1 text-xs text-rose-600">{errors.purchase_price}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Selling Price *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.selling_price}
              onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
            {errors.selling_price && (
              <p className="mt-1 text-xs text-rose-600">{errors.selling_price}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {product ? 'Available Quantity' : 'Opening Stock Quantity'} *
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.available_quantity}
              onChange={(e) => setForm({ ...form, available_quantity: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
            {errors.available_quantity && (
              <p className="mt-1 text-xs text-rose-600">{errors.available_quantity}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Minimum Stock Level *
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.min_stock_level}
              onChange={(e) => setForm({ ...form, min_stock_level: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
            {errors.min_stock_level && (
              <p className="mt-1 text-xs text-rose-600">{errors.min_stock_level}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            placeholder="Optional product specifications or notes..."
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
