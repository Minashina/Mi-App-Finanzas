import React, { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { calculateMSIForMonth } from '../utils/msi';
import { isSameMonth } from 'date-fns';
import { LayoutDashboard, TrendingDown, TrendingUp, CreditCard, PieChart as PieIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#8b5cf6', '#10b981', '#f43f5e', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#8ebd4e'];

export default function Dashboard() {
  const { accounts, transactions } = useFinance();
  const currentMonthDate = new Date();

  // 1. Filtrar Transacciones del Mes
  const thisMonthTxs = useMemo(() => {
    return transactions.filter(tx => 
        isSameMonth(tx.date.toDate ? tx.date.toDate() : new Date(tx.date), currentMonthDate)
    );
  }, [transactions]);

  // 2. Ingresos vs Gastos
  const totalIncome = thisMonthTxs
    .filter(tx => tx.type === 'income')
    .reduce((acc, tx) => acc + tx.amount, 0);

  const totalRegularExpense = thisMonthTxs
    .filter(tx => tx.type === 'expense' && !tx.isMSI)
    .reduce((acc, tx) => acc + tx.amount, 0);

  // 3. Cálculo MSI del mes
  const msiTxs = useMemo(() => {
    return transactions.filter(tx => tx.isMSI).map(tx => ({
        ...tx,
        date: tx.date.toDate ? tx.date.toDate() : new Date(tx.date)
    }));
  }, [transactions]);
  
  const currentMsiExpense = calculateMSIForMonth(msiTxs, currentMonthDate);

  const monthlyActualExpense = totalRegularExpense + currentMsiExpense;
  const balance = totalIncome - monthlyActualExpense;

  // 4. Datos para Recharts (Dashboard Visual)
  const expensesByCategory = useMemo(() => {
    const expenses = thisMonthTxs.filter(tx => tx.type === 'expense' && !tx.isMSI);
    
    // Aggregates regular expenses
    const categoryMap = expenses.reduce((acc, tx) => {
        acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
        return acc;
    }, {});

    // Add this month's MSI fractions to their respective categories
    msiTxs.forEach(tx => {
        // We only add to chart if it affects the CURRENT month's liquid expense
        const msiForThisTxThisMonth = calculateMSIForMonth([tx], currentMonthDate);
        if (msiForThisTxThisMonth > 0) {
            categoryMap[tx.category] = (categoryMap[tx.category] || 0) + msiForThisTxThisMonth;
        }
    });

    return Object.entries(categoryMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value); // Sort desc
  }, [thisMonthTxs, msiTxs]);

  // 5. Status de Crédito
  const creditCards = accounts.filter(a => a.type === 'credit');
  const creditUsage = creditCards.map(cc => {
    const ccTxs = transactions.filter(tx => tx.accountId === cc.id);
    const ccExpenses = ccTxs.filter(tx => tx.type === 'expense').reduce((acc, tx) => acc + tx.amount, 0);
    const ccPayments = ccTxs.filter(tx => tx.type === 'income').reduce((acc, tx) => acc + tx.amount, 0);
    const totalDebt = ccExpenses - ccPayments;
    const usagePercent = cc.creditLimit > 0 ? (totalDebt / cc.creditLimit) * 100 : 0;
    return { ...cc, totalDebt, usagePercent };
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <LayoutDashboard className="text-primary w-8 h-8" />
            Resumen de {currentMonthDate.toLocaleString('es-MX', { month: 'long' }).toUpperCase()}
          </h1>
          <div className="bg-surface border border-white/10 px-6 py-3 rounded-2xl flex gap-6 shadow-lg">
              <div className="text-center">
                  <p className="text-xs text-text-muted uppercase tracking-wider font-bold mb-1">Total Ingresos</p>
                  <p className="text-xl font-black text-success">${totalIncome.toLocaleString()}</p>
              </div>
              <div className="w-[1px] bg-white/10"></div>
              <div className="text-center">
                  <p className="text-xs text-text-muted uppercase tracking-wider font-bold mb-1">Total Gastos</p>
                  <p className="text-xl font-black text-danger">${monthlyActualExpense.toLocaleString()}</p>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        
        {/* Gráfica de Pastel (Recharts) */}
        <div className="lg:col-span-2 bg-surface p-6 rounded-3xl border border-white/5 shadow-lg flex flex-col">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <PieIcon className="text-primary" size={24}/> Distribución de Gastos
            </h2>
            <div className="flex-1 w-full min-h-[300px]">
                {expensesByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={expensesByCategory}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={120}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {expensesByCategory.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={(value) => `$${Number(value).toLocaleString()}`}
                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                                itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                            />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-text-muted opacity-50">
                        <PieIcon size={64} className="mb-4" />
                        <p>No hay gastos registrados este mes.</p>
                    </div>
                )}
            </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-rows-2 gap-6">
            <div className="bg-surface p-6 rounded-3xl border border-white/5 shadow-lg relative overflow-hidden flex flex-col justify-center">
                <div className="absolute -right-4 -top-4 opacity-5"><TrendingDown size={100} /></div>
                <p className="text-text-muted mb-1 text-sm font-semibold uppercase tracking-widest">Gastos Líquidos</p>
                <p className="text-4xl font-black text-danger">${monthlyActualExpense.toLocaleString()}</p>
                <div className="mt-4 flex justify-between text-xs font-medium text-text-muted">
                    <span>Directos: ${totalRegularExpense.toLocaleString()}</span>
                    <span>MSI: ${currentMsiExpense.toLocaleString()}</span>
                </div>
            </div>

            <div className="bg-gradient-to-br from-primary to-purple-700 p-6 rounded-3xl shadow-lg relative overflow-hidden text-white flex flex-col justify-center">
                <div className="absolute -right-4 -top-4 opacity-10"><TrendingUp size={100} /></div>
                <p className="text-white/70 mb-1 text-sm font-semibold uppercase tracking-widest">Balance Libre</p>
                <p className="text-4xl font-black">${balance.toLocaleString()}</p>
            </div>
        </div>

      </div>

      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
        <CreditCard className="text-primary" /> Uso de Crédito Real
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {creditUsage.map(cc => (
          <div key={cc.id} className="bg-surface p-6 rounded-3xl border border-white/5 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{cc.name}</h3>
              <span className="text-sm px-3 py-1 rounded-full bg-white/5 text-text-muted">
                Día Corte: {cc.cutoffDay}
              </span>
            </div>
            
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-text-muted">Deuda Total Activa</span>
              <span className="font-bold">${cc.totalDebt.toLocaleString()}</span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden mb-2 relative">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${cc.usagePercent > 80 ? 'bg-danger' : cc.usagePercent > 50 ? 'bg-yellow-500' : 'bg-success'}`}
                style={{ width: `${Math.min(cc.usagePercent, 100)}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-xs text-text-muted">
              <span>0%</span>
              <span>Límite: ${cc.creditLimit.toLocaleString()} ({cc.usagePercent.toFixed(1)}%)</span>
            </div>
          </div>
        ))}

        {creditCards.length === 0 && (
          <div className="col-span-full p-8 text-center text-text-muted bg-surface rounded-3xl border border-dashed border-white/10">
            No has agregado ninguna tarjeta de crédito.
          </div>
        )}
      </div>
    </div>
  );
}
