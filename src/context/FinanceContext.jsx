import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAccounts, getTransactions } from '../services/db';

const FinanceContext = createContext();

export const useFinance = () => useContext(FinanceContext);

export const FinanceProvider = ({ children }) => {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fetchedAccounts, fetchedTransactions] = await Promise.all([
        getAccounts(),
        getTransactions()
      ]);
      setAccounts(fetchedAccounts);
      setTransactions(fetchedTransactions);
      setError(null);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const refreshData = () => {
    fetchData();
  };

  const value = {
    accounts,
    transactions,
    loading,
    error,
    refreshData
  };

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
};
