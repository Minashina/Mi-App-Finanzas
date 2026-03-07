import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAccounts, getTransactions, getFixedExpenses } from '../services/db';

const FinanceContext = createContext();

export const useFinance = () => useContext(FinanceContext);

export const FinanceProvider = ({ children }) => {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fetchedAccounts, fetchedTransactions, fetchedFixed] = await Promise.all([
        getAccounts(),
        getTransactions(),
        getFixedExpenses()
      ]);
      setAccounts(fetchedAccounts);
      setTransactions(fetchedTransactions);
      setFixedExpenses(fetchedFixed);
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
    fixedExpenses,
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
