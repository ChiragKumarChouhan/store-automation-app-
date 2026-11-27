import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  LogOut,
  Menu,
  Search,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { settingsService } from '../../services/index.js';
import { RoleBadge } from '../common/StatusBadge.jsx';

export default function Header({ onOpenSidebar }) {
  const { user, logout, storeSettings } = useAuth();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const notifRef = useRef(null);

  useEffect(() => {
    let active = true;
    settingsService
      .notifications()
      .then((res) => {
        if (active) setAlerts(res.data?.alerts || []);
      })
      .catch(() => {});

    const timer = setInterval(() => {
      settingsService
        .notifications()
        .then((res) => {
          if (active) setAlerts(res.data?.alerts || []);
        })
        .catch(() => {});
    }, 30000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const handleOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleQuickSearch = (e) => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (!q) return;
    navigate(`/products?search=${encodeURIComponent(q)}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6 no-print">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-semibold text-slate-900">
              {storeSettings?.store_name || 'Store Automation'}
            </span>
            <span className="hidden sm:inline-block text-slate-300">|</span>
            <span className="hidden sm:inline-block text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded px-2 py-0.5">
              {storeSettings?.institution_name || 'ABESEC Ghaziabad'}
            </span>
          </div>
          <span className="sm:hidden text-[11px] font-medium text-blue-700">
            {storeSettings?.institution_name || 'ABESEC Ghaziabad'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <form onSubmit={handleQuickSearch} className="hidden md:block relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products or SKU..."
            className="w-56 lg:w-64 rounded-md border border-slate-300 bg-slate-50 py-1.5 pl-8 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </form>

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((prev) => !prev)}
            className="relative rounded-md border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
            aria-label="Inventory notifications"
          >
            <Bell className="h-4 w-4" />
            {alerts.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
                {alerts.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Stock Alerts
                </span>
                <span className="text-xs text-slate-500">{alerts.length} active</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {alerts.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-slate-500">
                    All products are above minimum stock levels.
                  </p>
                ) : (
                  alerts.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        navigate('/inventory?stock_status=low_stock');
                      }}
                      className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left hover:bg-slate-50"
                    >
                      <AlertTriangle
                        className={`h-4 w-4 shrink-0 mt-0.5 ${
                          item.severity === 'out_of_stock'
                            ? 'text-rose-600'
                            : 'text-amber-500'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-900">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {item.sku} · Qty: {item.available_quantity} (Min: {item.min_stock_level})
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-semibold text-slate-900 leading-tight">
              {user?.full_name}
            </span>
            <div className="mt-0.5">
              <RoleBadge role={user?.role} />
            </div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700 border border-slate-200 sm:hidden">
            <UserIcon className="h-4 w-4" />
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-rose-700"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
