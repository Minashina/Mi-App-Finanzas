import React, { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { calculateMSIForMonth, calculateRemainingMSIDebt } from '../utils/msi';
import { isSameMonth } from 'date-fns';
import { LayoutDashboard, Wallet, Receipt, CalendarSync, Landmark, PieChart as PieIcon, CreditCard } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#8b5cf6', '#10b981', '#f43f5e', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#8ebd4e'];

export default function Dashboard() {
  const { accounts, transactions, fixedExpenses } = useFinance();
  const currentMonthDate = new Date();

  // 1. Filtrar Transacciones del Mes
  const thisMonthTxs = useMemo(() => {
    return transactions.filter(tx => 
        isSameMonth(tx.date.toDate ? tx.date.toDate() : new Date(tx.date), currentMonthDate)
    );
  }, [transactions]);

  const totalRegularExpense = thisMonthTxs
    .filter(tx => tx.type === 'expense' && !tx.isMSI)
    .reduce((acc, tx) => acc + tx.amount, 0);

  // 2. MSI Activos
  const msiTxs = useMemo(() => {
    return transactions.filter(tx => tx.isMSI).map(tx => ({
        ...tx,
        date: tx.date.toDate ? tx.date.toDate() : new Date(tx.date)
    }));
  }, [transactions]);
  
  const currentMsiExpense = calculateMSIForMonth(msiTxs, currentMonthDate);
  const totalMSIDebtActive = msiTxs.reduce((sum, tx) => sum + calculateRemainingMSIDebt(tx), 0);

  // 3. Gastos Fijos
  const totalFixedExpenses = fixedExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // KPI 1: Total a Pagar Este Mes
  const totalToPayThisMonth = totalRegularExpense + currentMsiExpense + totalFixedExpenses;

  // KPI 4: Saldo Disponible Real (Líquido)
  const totalCashAndDebit = accounts
    .filter(a => a.type === 'debit' || a.type === 'cash')
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  const realAvailableBalance = totalCashAndDebit - totalToPayThisMonth;

  // 5. Status de Crédito & KPI 2 (Deuda Actual Total TC)
  const creditCards = accounts.filter(a => a.type === 'credit');
  let totalCreditDebt = 0;

  const creditUsage = creditCards.map(cc => {
    const ccTxs = transactions.filter(tx => tx.accountId === cc.id);
    
    // Gastos directos de la TC
    const regularExpenses = ccTxs.filter(tx => tx.type === 'expense' && !tx.isMSI).reduce((acc, tx) => acc + tx.amount, 0);
    
    // Deuda MSI remanente calculada según factor de tiempo (Solo suma lo que falta por pagar)
    const msiRemaining = ccTxs.filter(tx => tx.isMSI).reduce((acc, tx) => acc + calculateRemainingMSIDebt(tx), 0);
    
    // Pagos a la TC
    const ccPayments = ccTxs.filter(tx => tx.type === 'income').reduce((acc, tx) => acc + tx.amount, 0);
    
    // Deuda total de esta tarjeta
    const totalDebt = (regularExpenses + msiRemaining) - ccPayments;
    const actualDebt = Math.max(0, totalDebt);
    
    totalCreditDebt += actualDebt;

    const usagePercent = cc.creditLimit > 0 ? (actualDebt / cc.creditLimit) * 100 : 0;
    return { ...cc, totalDebt: actualDebt, usagePercent };
  });

  // Datos para Recharts (Dashboard Visual)
  const expensesByCategory = useMemo(() => {
    const expenses = thisMonthTxs.filter(tx => tx.type === 'expense' && !tx.isMSI);
    
    const categoryMap = expenses.reduce((acc, tx) => {
        acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
        return acc;
    }, {});

    msiTxs.forEach(tx => {
        const msiForThisTxThisMonth = calculateMSIForMonth([tx], currentMonthDate);
        if (msiForThisTxThisMonth > 0) {
            categoryMap[tx.category] = (categoryMap[tx.category] || 0) + msiForThisTxThisMonth;
        }
    });

    // Agregar Gastos Fijos al PieChart
    fixedExpenses.forEach(exp => {
        categoryMap[exp.category] = (categoryMap[exp.category] || 0) + exp.amount;
    });

    return Object.entries(categoryMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value); 
  }, [thisMonthTxs, msiTxs, fixedExpenses]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <LayoutDashboard className="text-primary w-8 h-8" />
            Resumen de {currentMonthDate.toLocaleString('es-MX', { month: 'long' }).toUpperCase()}
          </h1>
      </div>

      {/* 4 KPIs Financieros (Top Level) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KPI: Saldo Disponible Real */}
        <div className="bg-gradient-to-br from-primary to-purple-800 p-6 rounded-3xl shadow-lg relative overflow-hidden text-white flex flex-col justify-between">
            <div className="absolute right-4 top-4 opacity-20"><Landmark size={48} /></div>
            <div>
                <p className="text-white/80 mb-1 text-xs font-bold uppercase tracking-widest">Saldo Disponible Real</p>
                <p className="text-4xl font-black">${realAvailableBalance.toLocaleString()}</p>
            </div>
            <p className="text-xs text-white/60 mt-4 leading-tight">
                Dinero libre en débito/efectivo, habiendo restado tus obligaciones de este mes.
            </p>
        </div>

        {/* KPI: Total a Pagar Este Mes */}
        <div className="bg-surface p-6 rounded-3xl border border-white/5 shadow-lg relative overflow-hidden flex flex-col justify-between group hover:border-danger/30 transition-colors">
            <div className="absolute right-4 top-4 opacity-10 group-hover:opacity-20 transition-opacity text-danger"><Receipt size={48} /></div>
            <div>
                <p className="text-text-muted mb-1 text-xs font-bold uppercase tracking-widest">A Pagar este Mes</p>
                <p className="text-3xl font-black text-danger">${totalToPayThisMonth.toLocaleString()}</p>
            </div>
            <div className="mt-4 text-xs font-medium text-text-muted space-y-1">
                <div className="flex justify-between"><span>Gastos Fijos:</span> <span>${totalFixedExpenses.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>MSI (Cuotas):</span> <span>${currentMsiExpense.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>TC (Directos):</span> <span>${totalRegularExpense.toLocaleString()}</span></div>
            </div>
        </div>

        {/* KPI: Deuda TC */}
        <div className="bg-surface p-6 rounded-3xl border border-white/5 shadow-lg relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-4 top-4 opacity-5"><CreditCard size={48} /></div>
            <div>
                <p className="text-text-muted mb-1 text-xs font-bold uppercase tracking-widest">Deuda Actual Total</p>
                <p className="text-3xl font-black text-white">${totalCreditDebt.toLocaleString()}</p>
            </div>
            <p className="text-xs text-text-muted mt-4 leading-tight">
                Sumatoria de deudas activas en todas tus tarjetas de crédito institucionales.
            </p>
        </div>

        {/* KPI: MSI Activos totales */}
        <div className="bg-surface p-6 rounded-3xl border border-white/5 shadow-lg relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-4 top-4 opacity-5"><CalendarSync size={48} /></div>
            <div>
                <p className="text-text-muted mb-1 text-xs font-bold uppercase tracking-widest">Deuda MSI Activa</p>
                <p className="text-3xl font-black text-primary-light">${totalMSIDebtActive.toLocaleString()}</p>
            </div>
            <p className="text-xs text-text-muted mt-4 leading-tight">
                Saldo total comprometido a meses sin intereses a futuro.
            </p>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfica de Pastel (Recharts) */}
        <div className="lg:col-span-3 xl:col-span-2 bg-surface p-6 rounded-3xl border border-white/5 shadow-lg flex flex-col min-h-[400px]">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <PieIcon className="text-primary" size={24}/> Distribución de Pagos del Mes
            </h2>
            <div className="flex-1 w-full relative">
                {expensesByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={expensesByCategory}
                                cx="50%"
                                cy="50%"
                                innerRadius={90}
                                outerRadius={140}
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-text-muted opacity-50">
                        <PieIcon size={64} className="mb-4" />
                        <p>No hay gastos o compromisos este mes.</p>
                    </div>
                )}
            </div>
        </div>

        {/* Cuentas Débito Listado Sidebar */}
        <div className="lg:col-span-3 xl:col-span-1 bg-surface p-6 rounded-3xl border border-white/5 shadow-lg">
             <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Wallet className="text-success" size={24}/> Tu Dinero
            </h2>
            <div className="flex flex-col gap-4">
                {accounts.filter(a => a.type === 'debit' || a.type === 'cash').map(acc => (
                    <div key={acc.id} className="p-4 bg-black/20 rounded-2xl flex justify-between items-center border border-white/5">
                        <span className="font-semibold">{acc.name}</span>
                        <span className="font-black text-success">${acc.balance?.toLocaleString()}</span>
                    </div>
                ))}
                
                {accounts.filter(a => a.type === 'debit' || a.type === 'cash').length === 0 && (
                     <div className="p-4 text-center text-sm text-text-muted border border-dashed border-white/10 rounded-2xl">
                         No has agregado cuentas de débito o efectivo.
                     </div>
                )}
            </div>
        </div>

      </div>

      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 pt-6">
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
