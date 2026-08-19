import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AccountContext = createContext(null);

export function AccountProvider({ children }) {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(
    () => localStorage.getItem('arbitragex_selected_account') || null
  );
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data);

      // Auto-select first account if none selected or if selected was deleted
      if (res.data.length > 0) {
        const ids = res.data.map(a => a.id);
        if (!selectedAccountId || !ids.includes(selectedAccountId)) {
          const firstId = res.data[0].id;
          setSelectedAccountId(firstId);
          localStorage.setItem('arbitragex_selected_account', firstId);
        }
      } else {
        setSelectedAccountId(null);
        localStorage.removeItem('arbitragex_selected_account');
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const selectAccount = (id) => {
    setSelectedAccountId(id);
    localStorage.setItem('arbitragex_selected_account', id);
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId) || null;

  return (
    <AccountContext.Provider value={{
      accounts,
      selectedAccountId,
      selectedAccount,
      selectAccount,
      refreshAccounts: fetchAccounts,
      loading,
      hasAccounts: accounts.length > 0
    }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used within AccountProvider');
  return ctx;
}
