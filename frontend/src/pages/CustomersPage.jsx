import { useCallback, useEffect, useState } from 'react';
import { Edit2, History, Plus, Search, Trash2, Users } from 'lucide-react';
import { customerService } from '../services/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import Pagination from '../components/common/Pagination.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Modal from '../components/common/Modal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';

const INITIAL_FORM = {
  name: '',
  phone: '',
  email: '',
  address: '',
  registration_date: new Date().toISOString().slice(0, 10),
};

export default function CustomersPage() {
  const { isAdmin, formatCurrency } = useAuth();
  const toast = useToast();

  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [deletingCustomer, setDeletingCustomer] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [historyData, setHistoryData] = useState(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customerService.list({ search, page, limit: 15 });
      setCustomers(res.data.items || []);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error(err.message || 'Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, [search, page, toast]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const openAdd = () => {
    setEditingCustomer(null);
    setForm({
      ...INITIAL_FORM,
      registration_date: new Date().toISOString().slice(0, 10),
    });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (cust) => {
    setEditingCustomer(cust);
    setForm({
      name: cust.name || '',
      phone: cust.phone || '',
      email: cust.email || '',
      address: cust.address || '',
      registration_date: cust.registration_date
        ? String(cust.registration_date).slice(0, 10)
        : '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Customer name is required.';
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
      if (editingCustomer) {
        await customerService.update(editingCustomer.id, form);
        toast.success('Customer updated successfully.');
      } else {
        await customerService.create(form);
        toast.success('Customer added successfully.');
      }
      setModalOpen(false);
      loadCustomers();
    } catch (err) {
      toast.error(err.message || 'Failed to save customer.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;
    setDeleteLoading(true);
    try {
      await customerService.remove(deletingCustomer.id);
      toast.success('Customer deleted successfully.');
      setDeletingCustomer(null);
      loadCustomers();
    } catch (err) {
      toast.error(err.message || 'Failed to delete customer.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openHistory = async (custId) => {
    try {
      const res = await customerService.history(custId);
      setHistoryData(res.data);
    } catch (err) {
      toast.error(err.message || 'Failed to load purchase history.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Customer Management</h1>
          <p className="text-sm text-slate-500">
            Maintain customer records and review individual purchase histories.
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 self-start rounded-md bg-blue-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </button>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by customer ID, name, phone, or email..."
            className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        {loading ? (
          <LoadingSpinner label="Loading customers..." />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers found"
            description="No customer profiles match your search."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                    <th className="pb-3 pr-3 font-medium">Customer ID</th>
                    <th className="pb-3 pr-3 font-medium">Name</th>
                    <th className="pb-3 pr-3 font-medium">Phone &amp; Email</th>
                    <th className="pb-3 pr-3 font-medium">Address</th>
                    <th className="pb-3 pr-3 font-medium">Registered</th>
                    <th className="pb-3 pr-3 font-medium">Orders / Spent</th>
                    <th className="pb-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70">
                      <td className="py-3 pr-3 font-mono text-xs font-medium text-slate-700">
                        {c.customer_code}
                      </td>
                      <td className="py-3 pr-3 font-medium text-slate-900">{c.name}</td>
                      <td className="py-3 pr-3">
                        <div className="text-slate-800">{c.phone}</div>
                        <div className="text-xs text-slate-500">{c.email || '—'}</div>
                      </td>
                      <td className="py-3 pr-3 text-xs text-slate-600 max-w-xs truncate">
                        {c.address || '—'}
                      </td>
                      <td className="py-3 pr-3 text-xs text-slate-500">
                        {new Date(c.registration_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 pr-3">
                        <div className="text-xs font-medium text-slate-900">
                          {c.total_orders} orders
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatCurrency(c.total_spent)}
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openHistory(c.id)}
                            title="Purchase History"
                            className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                          >
                            <History className="h-3.5 w-3.5" />
                            History
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEdit(c)}
                                title="Edit Customer"
                                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingCustomer(c)}
                                title="Delete Customer"
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

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Customer Name *
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
                Phone Number *
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
              {errors.phone && <p className="mt-1 text-xs text-rose-600">{errors.phone}</p>}
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
          </div>
          {!editingCustomer && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Registration Date
              </label>
              <input
                type="date"
                value={form.registration_date}
                onChange={(e) => setForm({ ...form, registration_date: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
          )}
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
              {saving ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Purchase History Modal */}
      <Modal
        isOpen={Boolean(historyData)}
        onClose={() => setHistoryData(null)}
        title={`Purchase History · ${historyData?.customer?.name || ''}`}
        subtitle={
          historyData
            ? `${historyData.customer.customer_code} · ${historyData.customer.phone}`
            : ''
        }
        size="lg"
      >
        {historyData &&
          (historyData.purchases.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              This customer has not made any purchases yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-2 font-medium">Invoice #</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Items</th>
                    <th className="pb-2 font-medium">Payment</th>
                    <th className="pb-2 text-right font-medium">Discount</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyData.purchases.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 font-mono font-medium text-slate-900">
                        {p.invoice_number}
                      </td>
                      <td className="py-2 text-slate-600">
                        {new Date(p.sale_date).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 text-slate-600">{p.item_count}</td>
                      <td className="py-2 text-slate-600">{p.payment_method}</td>
                      <td className="py-2 text-right text-slate-600">
                        {formatCurrency(p.discount_amount)}
                      </td>
                      <td className="py-2 text-right font-semibold text-slate-900">
                        {formatCurrency(p.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deletingCustomer)}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete Customer"
        message={
          deletingCustomer
            ? `Are you sure you want to remove "${deletingCustomer.name}"? Past invoices will be preserved as Walk-in Customer.`
            : ''
        }
      />
    </div>
  );
}
