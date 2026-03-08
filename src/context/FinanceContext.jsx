import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAccounts, getTransactions, getFixedExpenses, getSavings } from '../services/db';

const FinanceContext = createContext();

export const useFinance = () => useContext(FinanceContext);

export const FinanceProvider = ({ children }) => {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [savings, setSavings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [globalMonth, setGlobalMonth] = useState(new Date());

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fetchedAccounts, fetchedTransactions, fetchedFixed, fetchedSavings] = await Promise.all([
        getAccounts(),
        getTransactions(),
        getFixedExpenses(),
        getSavings()
      ]);
      setAccounts(fetchedAccounts);
      setTransactions(fetchedTransactions);
      setFixedExpenses(fetchedFixed);
      setSavings(fetchedSavings);
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
    savings,
    loading,
    error,
    refreshData,
    globalMonth,
    setGlobalMonth
  };

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
};
