import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authService } from '../services/index.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [storeSettings, setStoreSettings] = useState({
    store_name: 'Store Automation',
    institution_name: 'ABESEC Ghaziabad',
    currency_symbol: '₹',
    default_tax_rate: 0,
    invoice_prefix: 'INV',
    student_can_create_sales: true,
  });
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await authService.me();
      setUser(res.data.user);
      if (res.data.storeSettings) {
        setStoreSettings(res.data.storeSettings);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = async (credentials) => {
    const res = await authService.login(credentials);
    setUser(res.data.user);
    if (res.data.storeSettings) {
      setStoreSettings(res.data.storeSettings);
    }
    return res.data.user;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  };

  const formatCurrency = useCallback(
    (value) => {
      const symbol = storeSettings?.currency_symbol || '₹';
      const num = Number(value || 0);
      return `${symbol}${num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    },
    [storeSettings?.currency_symbol]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.role === 'admin',
        storeSettings,
        setStoreSettings,
        loading,
        login,
        logout,
        refreshAuth,
        formatCurrency,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
