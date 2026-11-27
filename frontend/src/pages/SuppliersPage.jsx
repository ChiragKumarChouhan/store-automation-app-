import { useCallback, useEffect, useState } from 'react';
import { Edit2, Eye, Plus, Search, Trash2, Truck } from 'lucide-react';
import { supplierService } from '../services/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Modal from '../components/common/Modal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';

const INITIAL_FORM = {
  name: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
};

export default function SuppliersPage() {
  const { isAdmin, formatCurrency } = useAuth();
  const toast = useToast();

  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [detailSupplier, setDetailSupplier] = useState(null);
  const [deletingSupplier, setDeletingSupplier] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await supplierService.list({ search });
      setSuppliers(res.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load suppliers.');
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const openAdd = () => {
    setEditingSupplier(null);
    setForm(INITIAL_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (sup) => {
    setEditingSupplier(sup);
    setForm({
      name: sup.name || '',
      contact_person: sup.contact_person || '',
      phone: sup.phone || '',
      email: sup.email || '',
      address: sup.address || '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Supplier name is required.';
    if (!form.contact_person.trim()) next.contact_person = 'Contact person is required.';
    if (!form.phone.trim()) next.phone = 'Phone number is required.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Enter a valid email address.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingSupplier) {
        await supplierService.update(editingSupplier.id, form);
        toast.success('Supplier updated successfully.');
      } else {
        await supplierService.create(form);
        toast.success('Supplier added successfully.');
      }
      setModalOpen(false);
      loadSuppliers();
    } catch (err) {
      toast.error(err.message || 'Failed to save supplier.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSupplier) return;
    setDeleteLoading(true);
    try {
      await supplierService.remove(deletingSupplier.id);
      toast.success('Supplier deleted successfully.');
      setDeletingSupplier(null);
      loadSuppliers();
    } catch (err) {
      toast.error(err.message || 'Failed to delete supplier.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const viewDetails = async (id) => {
    try {
      const res = await supplierService.getById(id);
      setDetailSupplier(res.data);
    } catch (err) {
      toast.error(err.message || 'Failed to load supplier details.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Supplier Management</h1>
          <p className="text-sm text-slate-500">
            Manage vendor contacts and view products supplied by each partner.
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 self-start rounded-md bg-blue-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Supplier
          </button>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search supplier name, contact person, or phone..."
            className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading suppliers..." />
      ) : suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No suppliers found"
          description="No supplier records match your search."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers.map((sup) => (
            <div
              key={sup.id}
              className="rounded-lg border border-slate-200 bg-white p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{sup.name}</h3>
                    <p className="text-xs text-slate-500">
                      Contact: <span className="font-medium text-slate-700">{sup.contact_person}</span>
                    </p>
                  </div>
                  <span className="rounded bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {sup.products_count} products
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <div>Phone: {sup.phone}</div>
                  <div>Email: {sup.email || '—'}</div>
                  <div>Address: {sup.address || '—'}</div>
                </div>

                {sup.products_supplied?.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Products Supplied
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {sup.products_supplied.slice(0, 4).map((p) => (
                        <span
                          key={p.id}
                          className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700"
                        >
                          {p.name}
                        </span>
                      ))}
                      {sup.products_supplied.length > 4 && (
                        <span className="text-[11px] text-slate-500 self-center">
                          +{sup.products_supplied.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => viewDetails(sup.id)}
                  className="inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Eye className="h-3.5 w-3.5" /> View Details
                </button>
                {isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => openEdit(sup)}
                      className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <Edit2 className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingSupplier(sup)}
                      className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Supplier Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Supplier Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
            {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Contact Person *
              </label>
              <input
                type="text"
                value={form.contact_person}
                onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
              {errors.contact_person && (
                <p className="mt-1 text-xs text-rose-600">{errors.contact_person}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Phone *
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
              {errors.phone && <p className="mt-1 text-xs text-rose-600">{errors.phone}</p>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
            {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Address</label>
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Supplier Detail Modal */}
      <Modal
        isOpen={Boolean(detailSupplier)}
        onClose={() => setDetailSupplier(null)}
        title={detailSupplier?.name || 'Supplier Details'}
        subtitle={
          detailSupplier ? `Contact Person: ${detailSupplier.contact_person}` : ''
        }
        size="lg"
      >
        {detailSupplier && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-md bg-slate-50 border border-slate-200 p-3 text-xs">
              <div>
                <span className="text-slate-500">Phone</span>
                <p className="font-medium text-slate-900 mt-0.5">{detailSupplier.phone}</p>
              </div>
              <div>
                <span className="text-slate-500">Email</span>
                <p className="font-medium text-slate-900 mt-0.5">
                  {detailSupplier.email || '—'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Address</span>
                <p className="font-medium text-slate-900 mt-0.5">
                  {detailSupplier.address || '—'}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Products Supplied ({detailSupplier.products_supplied?.length || 0})
              </h4>
              {detailSupplier.products_supplied?.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No products are currently linked to this supplier.
                </p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-md">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                        <th className="px-3 py-2 font-medium">SKU</th>
                        <th className="px-3 py-2 font-medium">Product</th>
                        <th className="px-3 py-2 text-right font-medium">Purchase</th>
                        <th className="px-3 py-2 text-right font-medium">Selling</th>
                        <th className="px-3 py-2 text-right font-medium">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailSupplier.products_supplied.map((p) => (
                        <tr key={p.id}>
                          <td className="px-3 py-2 font-mono text-slate-600">{p.sku}</td>
                          <td className="px-3 py-2 font-medium text-slate-900">{p.name}</td>
                          <td className="px-3 py-2 text-right text-slate-600">
                            {formatCurrency(p.purchase_price)}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-900">
                            {formatCurrency(p.selling_price)}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-slate-800">
                            {p.available_quantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deletingSupplier)}
        onClose={() => setDeletingSupplier(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete Supplier"
        message={
          deletingSupplier
            ? `Delete supplier "${deletingSupplier.name}"? Linked products will remain in the catalog as Unassigned.`
            : ''
        }
      />
    </div>
  );
}
