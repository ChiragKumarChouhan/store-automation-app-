import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  Store,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { to: '/inventory', label: 'Inventory', icon: Boxes, adminOnly: false },
  { to: '/products', label: 'Products', icon: Package, adminOnly: false },
  { to: '/sales', label: 'Sales & Billing', icon: Receipt, adminOnly: false },
  { to: '/customers', label: 'Customers', icon: Users, adminOnly: false },
  { to: '/suppliers', label: 'Suppliers', icon: Truck, adminOnly: false },
  { to: '/reports', label: 'Reports', icon: BarChart3, adminOnly: false },
  { to: '/users', label: 'Users', icon: ShieldCheck, adminOnly: true },
  { to: '/settings', label: 'Settings', icon: Settings, adminOnly: false },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const { isAdmin, storeSettings } = useAuth();
  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-slate-100 transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } no-print`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
              <Store className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white">
                {storeSettings?.store_name || 'Store Automation'}
              </div>
              <div className="text-[11px] text-slate-400">
                {storeSettings?.institution_name || 'ABESEC Ghaziabad'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
          <div className="font-medium text-slate-300">Academic Project 2026</div>
          <div>Full Stack Development</div>
        </div>
      </aside>
    </>
  );
}
