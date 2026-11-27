import { useEffect, useState } from 'react';
import { Lock, Save, Store } from 'lucide-react';
import { authService, settingsService } from '../services/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import { RoleBadge } from '../components/common/StatusBadge.jsx';

export default function SettingsPage() {
  const { user, isAdmin, setStoreSettings } = useAuth();
  const toast = useToast();

  const [storeForm, setStoreForm] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    settingsService
      .get()
      .then((res) => {
        setStoreForm(res.data);
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load settings.');
      })
      .finally(() => setLoadingSettings(false));
  }, [toast]);

  const handleSaveStoreSettings = async (e) => {
    e.preventDefault();
    if (!storeForm.store_name?.trim() || !storeForm.institution_name?.trim()) {
      toast.error('Store name and institution name are required.');
      return;
    }

    setSavingSettings(true);
    try {
      const res = await settingsService.update(storeForm);
      setStoreForm(res.data);
      setStoreSettings(res.data);
      toast.success('Application settings saved.');
    } catch (err) {
      toast.error(err.message || 'Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error('Enter both current and new passwords.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success(res.message || 'Password updated.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loadingSettings) {
    return <LoadingSpinner label="Loading application settings..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          Manage your account credentials and system-wide Store Automation preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account Profile & Password Change */}
        <div className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Profile Summary</h2>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Full Name</span>
                <span className="font-medium text-slate-900">{user?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Username</span>
                <span className="font-mono text-slate-800">{user?.username}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Role</span>
                <RoleBadge role={user?.role} />
              </div>
            </div>
          </div>

          <form
            onSubmit={handleChangePassword}
            className="rounded-lg border border-slate-200 bg-white p-5 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-900">Change Password</h2>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="w-full rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {savingPassword ? 'Updating...' : 'Update My Password'}
            </button>
          </form>
        </div>

        {/* Store Configuration (Admin Only editable) */}
        <div className="lg:col-span-2">
          <form
            onSubmit={handleSaveStoreSettings}
            className="rounded-lg border border-slate-200 bg-white p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-blue-600" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Store &amp; System Configuration
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isAdmin
                      ? 'Configure billing rules, institutional info, and student permissions.'
                      : 'View-only mode. Only administrators can modify system-wide settings.'}
                  </p>
                </div>
              </div>
            </div>

            {storeForm && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Store / Application Name *
                    </label>
                    <input
                      type="text"
                      disabled={!isAdmin}
                      value={storeForm.store_name || ''}
                      onChange={(e) =>
                        setStoreForm({ ...storeForm, store_name: e.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Institution Name *
                    </label>
                    <input
                      type="text"
                      disabled={!isAdmin}
                      value={storeForm.institution_name || ''}
                      onChange={(e) =>
                        setStoreForm({ ...storeForm, institution_name: e.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      disabled={!isAdmin}
                      value={storeForm.phone || ''}
                      onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      disabled={!isAdmin}
                      value={storeForm.email || ''}
                      onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Currency Symbol
                    </label>
                    <input
                      type="text"
                      disabled={!isAdmin}
                      value={storeForm.currency_symbol || '₹'}
                      onChange={(e) =>
                        setStoreForm({ ...storeForm, currency_symbol: e.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Default Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      disabled={!isAdmin}
                      value={storeForm.default_tax_rate ?? 0}
                      onChange={(e) =>
                        setStoreForm({ ...storeForm, default_tax_rate: e.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Invoice Prefix
                    </label>
                    <input
                      type="text"
                      disabled={!isAdmin}
                      value={storeForm.invoice_prefix || 'INV'}
                      onChange={(e) =>
                        setStoreForm({
                          ...storeForm,
                          invoice_prefix: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:border-blue-600 focus:outline-none disabled:bg-slate-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Store Address
                  </label>
                  <textarea
                    rows={2}
                    disabled={!isAdmin}
                    value={storeForm.address || ''}
                    onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none disabled:bg-slate-50"
                  />
                </div>

                <div className="rounded-md border border-slate-200 bg-slate-50 p-3.5">
                  <label className="flex items-start gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      disabled={!isAdmin}
                      checked={Boolean(storeForm.student_can_create_sales)}
                      onChange={(e) =>
                        setStoreForm({
                          ...storeForm,
                          student_can_create_sales: e.target.checked,
                        })
                      }
                      className="mt-1 rounded border-slate-300 text-blue-600"
                    />
                    <span>
                      <span className="font-medium text-slate-900 block">
                        Allow Student accounts to create sales transactions
                      </span>
                      <span className="text-xs text-slate-500">
                        When disabled, Student logins can view records and reports but cannot create new invoices.
                      </span>
                    </span>
                  </label>
                </div>

                {isAdmin && (
                  <div className="flex justify-end pt-2 border-t border-slate-200">
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      {savingSettings ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                )}
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
