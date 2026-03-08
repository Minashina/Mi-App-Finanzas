import React, { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { calculateMSIForMonth, calculateRemainingMSIDebt } from '../utils/msi';
import { isSameMonth } from 'date-fns';
import { LayoutDashboard, Wallet, Receipt, CalendarSync, Landmark, PieChart as PieIcon, CreditCard, PiggyBank, Clock3 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#8b5cf6', '#10b981', '#f43f5e', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#8ebd4e'];

// Colors for Accounts
const ACCOUNT_COLORS = {
    'default': 'bg-surface border-white/5',
    'red': 'bg-red-900/20 border-red-500/30',
    'blue': 'bg-blue-900/20 border-blue-500/30',
    'green': 'bg-green-900/20 border-green-500/30',
    'purple': 'bg-purple-900/20 border-purple-500/30',
    'orange': 'bg-orange-900/20 border-orange-500/30'
};

export default function Dashboard() {
  const { accounts, transactions, fixedExpenses, savings } = useFinance();
  const currentMonthDate = new Date();

  // 1. Filtrar Transacciones del Mes
  const thisMonthTxs = useMemo(() => {
    return transactions.filter(tx => 
        isSameMonth(tx.date.toDate ? tx.date.toDate() : new Date(tx.date), currentMonthDate)
    );
  }, [transactions]);

  // 1b. Gastos Regulares de TC que vencen en este "corte" de mes
  const creditCardStatementTxs = useMemo(() => {
     return transactions.filter(tx => {
        if (tx.type !== 'expense' || tx.isMSI) return false;
        const acc = accounts.find(a => a.id === tx.accountId);
        if (!acc || acc.type !== 'credit') return false;

        const txDate = tx.date.toDate ? tx.date.toDate() : new Date(tx.date);
        
        if (acc.cutoffDay) {
             const cutoff = Number(acc.cutoffDay);
             const targetYear = currentMonthDate.getFullYear();
             const targetMonth = currentMonthDate.getMonth();
             
             const currentStatementCutoff = new Date(targetYear, targetMonth, cutoff);
             currentStatementCutoff.setHours(23, 59, 59, 999);
             
             const previousStatementCutoff = new Date(targetYear, targetMonth - 1, cutoff);
             previousStatementCutoff.setHours(23, 59, 59, 999);
             
             return txDate > previousStatementCutoff && txDate <= currentStatementCutoff;
        } else {
             return isSameMonth(txDate, currentMonthDate);
        }
     });
  }, [transactions, accounts, currentMonthDate]);

  const totalRegularExpense = creditCardStatementTxs.reduce((acc, tx) => acc + tx.amount, 0);

  // 2. MSI Activos
  const msiTxs = useMemo(() => {
    return transactions.filter(tx => tx.isMSI).map(tx => ({
        ...tx,
        date: tx.date.toDate ? tx.date.toDate() : new Date(tx.date)
    }));
  }, [transactions]);
  
  const currentMsiExpense = calculateMSIForMonth(msiTxs, currentMonthDate);
  const unpaidMsiExpense = calculateMSIForMonth(msiTxs, currentMonthDate, true, false);
  const paidMsiExpense = calculateMSIForMonth(msiTxs, currentMonthDate, false, true);
  
  const totalMSIDebtActive = msiTxs.reduce((sum, tx) => sum + calculateRemainingMSIDebt(tx), 0);

  // 3. Gastos Fijos (Solo la porción que falta por pagar este mes)
  const unpaidFixedExpenses = fixedExpenses.reduce((sum, exp) => {
      // Buscar la suma de lo que ya se abonó este mes a este gasto
      const paidThisMonthTotal = thisMonthTxs
        .filter(tx => tx.type === 'expense' && tx.fixedExpenseId === exp.id)
        .reduce((acc, tx) => acc + tx.amount, 0);
        
      const remainingAmount = exp.amount - paidThisMonthTotal;
      if (remainingAmount <= 0) return sum; // Ya se pagó total o más de este servicio
      return sum + remainingAmount;
  }, 0);

  // KPI 1: Total a Pagar Este Mes
  const totalToPayThisMonth = totalRegularExpense + unpaidMsiExpense + unpaidFixedExpenses;

  // KPI 4: Saldo Disponible Real (Líquido)
  const totalCashAndDebit = accounts
    .filter(a => a.type === 'debit' || a.type === 'cash')
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  // El saldo real ahora SOLO resta las cuotas de MSI que el usuario indicó explícitamente haber pagado.
  // Los gastos regulares de TC NO se restan aquí, ya que el usuario los pagará manualmente registrando un egreso a la TDC.
  const realAvailableBalance = totalCashAndDebit - paidMsiExpense;

  // KPI 5: Total Ahorrado
  const totalSaved = savings.reduce((sum, s) => sum + s.savedAmount, 0);

  // Widget: Últimos 3 (gastos)
  const recentExpenses = useMemo(() => {
    return transactions.filter(tx => tx.type === 'expense').slice(0, 3);
  }, [transactions]);

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
    const availableCredit = Math.max(0, cc.creditLimit - actualDebt);

    const usagePercent = cc.creditLimit > 0 ? (actualDebt / cc.creditLimit) * 100 : 0;

    // --- CÁLCULO DE ESTADO DE CUENTA ACTUAL (A Pagar Este Mes/Corte) ---
    const statementExpenses = ccTxs.filter(tx => {
       if (tx.type !== 'expense' || tx.isMSI) return false;
       const txDate = tx.date.toDate ? tx.date.toDate() : new Date(tx.date);
       if (cc.cutoffDay) {
           const cutoff = Number(cc.cutoffDay);
           const targetYear = currentMonthDate.getFullYear();
           const targetMonth = currentMonthDate.getMonth();
           const currentStatementCutoff = new Date(targetYear, targetMonth, cutoff);
           currentStatementCutoff.setHours(23, 59, 59, 999);
           const previousStatementCutoff = new Date(targetYear, targetMonth - 1, cutoff);
           previousStatementCutoff.setHours(23, 59, 59, 999);
           return txDate > previousStatementCutoff && txDate <= currentStatementCutoff;
       }
       return isSameMonth(txDate, currentMonthDate);
    }).reduce((sum, tx) => sum + tx.amount, 0);

    // Sumar MSI impagos aplicables a este mes
    const statementMSI = calculateMSIForMonth(ccTxs.filter(tx => tx.isMSI), currentMonthDate, true, false);
    
    // (Opcional) Restar abonos recibidos dentro de este mismo corte.
    // Para no complicarlo, asumiendo "A pagar este corte" como un snapshot. 
    // Si queremos ser exactos a la vida real, los pagos restan el 'statement'. 
    // Usaremos el monto crudo facturado por simplicidad según el diseño solicitado.
    const currentStatementDebt = statementExpenses + statementMSI;

    return { ...cc, totalDebt: actualDebt, availableCredit, usagePercent, currentStatementDebt };
  });

  // Datos para Recharts (Dashboard Visual)
  const expensesByCategory = useMemo(() => {
    // Gastos de Débito/Efectivo de este mes calendario
    const debitCashExpenses = thisMonthTxs.filter(tx => {
        if (tx.type !== 'expense' || tx.isMSI) return false;
        const acc = accounts.find(a => a.id === tx.accountId);
        return acc && (acc.type === 'debit' || acc.type === 'cash');
    });

    const categoryMap = {};

    debitCashExpenses.forEach(tx => {
        categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
    });

    creditCardStatementTxs.forEach(tx => {
        categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
    });

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
  }, [thisMonthTxs, creditCardStatementTxs, msiTxs, fixedExpenses, accounts, currentMonthDate]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <LayoutDashboard className="text-primary w-8 h-8" />
            Resumen de {currentMonthDate.toLocaleString('es-MX', { month: 'long' }).toUpperCase()}
          </h1>
      </div>

      {/* 5 KPIs Financieros (Top Level) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        
        {/* KPI: Saldo Disponible Real */}
        <div className="bg-gradient-to-br from-primary to-purple-800 p-6 rounded-3xl shadow-lg relative overflow-hidden text-white flex flex-col justify-between">
            <div className="absolute right-4 top-4 opacity-20"><Landmark size={48} /></div>
            <div>
                <p className="text-white/80 mb-1 text-xs font-bold uppercase tracking-widest">Saldo Disponible Real</p>
                <p className="text-4xl font-black">${realAvailableBalance.toLocaleString()}</p>
            </div>
            <p className="text-xs text-white/60 mt-4 leading-tight">
                Dinero libre en débito/efectivo, restando tus deudas en TDC del mes. (No resta gastos fijos aún no pagados).
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
                <div className="flex justify-between"><span>Gastos Fijos:</span> <span>${unpaidFixedExpenses.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>MSI (Pdts):</span> <span>${unpaidMsiExpense.toLocaleString()}</span></div>
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

        {/* KPI: Total Ahorrado */}
        <div className="bg-surface p-6 rounded-3xl border border-white/5 shadow-lg relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-4 top-4 opacity-5"><PiggyBank size={48} /></div>
            <div>
                <p className="text-text-muted mb-1 text-xs font-bold uppercase tracking-widest">Total Ahorrado</p>
                <p className="text-3xl font-black text-success">${totalSaved.toLocaleString()}</p>
            </div>
            <p className="text-xs text-text-muted mt-4 leading-tight">
                Capital total protegido en tus metas de ahorro.
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
                        <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <Pie
                                data={expensesByCategory}
                                cx="50%"
                                cy="50%"
                                innerRadius="55%"
                                outerRadius="80%"
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
                {accounts.filter(a => a.type === 'debit' || a.type === 'cash').map(acc => {
                    const activeColorClass = ACCOUNT_COLORS[acc.color] || ACCOUNT_COLORS['default'];
                    return (
                        <div key={acc.id} className={`p-4 rounded-2xl flex justify-between items-center border ${activeColorClass}`}>
                            <span className="font-semibold">{acc.name}</span>
                            <span className="font-black text-success">${acc.balance?.toLocaleString()}</span>
                        </div>
                    );
                })}
                
                {accounts.filter(a => a.type === 'debit' || a.type === 'cash').length === 0 && (
                     <div className="p-4 text-center text-sm text-text-muted border border-dashed border-white/10 rounded-2xl">
                         No has agregado cuentas de débito o efectivo.
                     </div>
                )}
            </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
        
        {/* Ultimos Movimientos */}
        <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Clock3 className="text-primary" /> Últimos Movimientos
            </h2>
            <div className="bg-surface rounded-3xl border border-white/5 shadow-lg overflow-hidden flex flex-col">
                {recentExpenses.length === 0 ? (
                    <div className="flex-1 p-8 flex items-center justify-center text-text-muted text-sm">
                        No hay movimientos recientes.
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {recentExpenses.map((tx) => {
                            const acc = accounts.find(a => a.id === tx.accountId);
                            const d = tx.date.toDate ? tx.date.toDate() : new Date(tx.date);
                            return (
                                <div key={tx.id} className="p-4 sm:p-5 flex justify-between items-center hover:bg-white/5 transition-colors">
                                    <div className="flex flex-col">
                                        <p className="font-bold text-lg leading-tight">{tx.category}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-text-muted">{d.toLocaleDateString()}</span>
                                            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-md text-text-muted">{acc?.name || 'Tarjeta'}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-white text-xl">-${tx.amount.toLocaleString()}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>

        {/* Uso de Crédito */}
        <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <CreditCard className="text-primary" /> Uso de Crédito Real
            </h2>
            <div className="flex flex-col gap-4">
                {creditUsage.map(cc => {
                    const activeColorClass = ACCOUNT_COLORS[cc.color] || ACCOUNT_COLORS['default'];
                    return (
                    <div key={cc.id} className={`p-5 rounded-3xl border shadow-lg ${activeColorClass}`}>
                        <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">{cc.name}</h3>
                        <span className="text-xs px-2 py-1 rounded-full bg-black/30 text-white/80">
                            Corte: {cc.cutoffDay}
                        </span>
                        </div>
                    
                    <div className="mb-2 flex justify-between text-sm">
                        <span className="text-text-muted font-medium">Deuda Total Activa</span>
                        <span className="font-bold text-lg">${cc.totalDebt.toLocaleString()}</span>
                    </div>

                    <div className="mb-4 flex justify-between items-center text-sm bg-danger/10 p-2.5 rounded-xl border border-danger/20">
                        <span className="text-danger font-bold text-xs uppercase tracking-wide">A Pagar este Corte</span>
                        <span className="font-black text-xl text-danger">${cc.currentStatementDebt.toLocaleString()}</span>
                    </div>
                    
                    <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden mb-2 relative">
                    <div 
                        className={`h-full rounded-full transition-all duration-1000 ${cc.usagePercent > 80 ? 'bg-danger' : cc.usagePercent > 50 ? 'bg-yellow-500' : 'bg-success'}`}
                        style={{ width: `${Math.min(cc.usagePercent, 100)}%` }}
                    ></div>
                    </div>

                    <div className="flex justify-between text-xs text-text-muted font-medium">
                        <span>Disp: <strong className="text-white">${cc.availableCredit.toLocaleString()}</strong></span>
                        <span>Límite: ${cc.creditLimit.toLocaleString()} ({cc.usagePercent.toFixed(1)}%)</span>
                    </div>
                </div>
                    );
                })}

                {creditCards.length === 0 && (
                <div className="p-8 text-center text-text-muted bg-surface rounded-3xl border border-dashed border-white/10 text-sm">
                    No has agregado tarjetas de crédito.
                </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
