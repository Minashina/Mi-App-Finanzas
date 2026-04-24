import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { calculateMSIForMonth, calculateRemainingMSIDebt, calculateBilledMSISoFar } from '../utils/msi';
import { isSameMonth, format } from 'date-fns';
import { LayoutDashboard, Wallet, PieChart as PieIcon, Clock3, HelpCircle, Sparkles, KeyRound } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { startTour } from '../utils/tourConfig';
import { payCreditCard } from '../services/db';
import { getFinancialAdvice } from '../services/ai';
import { useToast } from '../context/ToastContext';
import { toJSDate } from '../utils/format';
import { ACCOUNT_COLOR_CLASSES } from '../utils/constants';
import BurnRateIndicator from '../components/BurnRateIndicator';
import ProjectedBalanceChart from '../components/ProjectedBalanceChart';
import { calculateBurnRate, calculateProjectedBalance } from '../utils/projections';
import KPIsGrid from '../components/dashboard/KPIsGrid';
import CreditUsageSection from '../components/dashboard/CreditUsageSection';
import BreakdownModal from '../components/dashboard/BreakdownModal';
import PayCardModal from '../components/dashboard/PayCardModal';
import ApiKeyModal from '../components/dashboard/ApiKeyModal';
import AiAdvisorModal from '../components/dashboard/AiAdvisorModal';

const COLORS = ['#8b5cf6', '#10b981', '#f43f5e', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#8ebd4e'];

// Crea una fecha de corte sin overflow: si el mes tiene menos días que `day`, usa el último día del mes.
const safeCutoffDate = (year, month, day) => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(day, lastDay), 23, 59, 59, 999);
};

export default function Dashboard() {
  const { accounts, transactions, fixedExpenses, savings, refreshData } = useFinance();
  const showToast = useToast();
  const currentMonthDate = new Date();

  // --- Modal State ---
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedCC, setSelectedCC] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [selectedDebitId, setSelectedDebitId] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [selectedBreakdownCC, setSelectedBreakdownCC] = useState(null);

  // --- AI State ---
  const [aiAdvice, setAiAdvice] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

  const handleSaveApiKey = (e) => {
      e.preventDefault();
      if (!apiKeyInput.trim()) return;
      localStorage.setItem('gemini_api_key', apiKeyInput.trim());
      setUserApiKey(apiKeyInput.trim());
      setShowApiKeyModal(false);
      setApiKeyInput('');
      handleTriggerAI(apiKeyInput.trim());
  };

  const handleClearApiKey = () => {
      if (window.confirm('¿Estás seguro de que deseas borrar tu clave de API de este navegador?')) {
          localStorage.removeItem('gemini_api_key');
          setUserApiKey('');
      }
  };

  const handleTriggerAI = async (keyToUse = userApiKey) => {
    if (!keyToUse) { setShowApiKeyModal(true); return; }
    setShowAiModal(true);
    setIsAiLoading(true);
    try {
        const advice = await getFinancialAdvice({
            realAvailableBalance,
            totalToPayThisMonth,
            totalSaved,
            totalEmergencyFund,
            avgCreditUsage,
            topCategories: expensesByCategory.slice(0, 3).map(c => ({ name: c.name, amount: c.value }))
        }, keyToUse);
        setAiAdvice(advice);
    } catch (err) {
        setAiAdvice(`❌ **¡Ops! Ocurrió un error.**\n\n${err.message}`);
        if (err.message.includes('clave de API')) {
            setAiAdvice(prev => prev + `\n\n*Puedes borrar tu clave actual usando el icono de llave pequeña junto al botón principal.*`);
        }
    } finally {
        setIsAiLoading(false);
    }
  };

  const handleOpenPayModal = (cc) => {
      setSelectedCC(cc);
      setPayAmount(cc.currentStatementDebt > 0 ? cc.currentStatementDebt.toFixed(2) : cc.totalDebt.toFixed(2));
      const debitAccounts = accounts.filter(a => a.type === 'debit' || a.type === 'cash');
      if (debitAccounts.length > 0) setSelectedDebitId(debitAccounts[0].id);
      setShowPayModal(true);
  };

  const handlePayCreditCard = async (e) => {
      e.preventDefault();
      if (!selectedDebitId || !payAmount) return;
      setIsPaying(true);
      try {
          await payCreditCard(selectedCC.id, selectedDebitId, Number(payAmount), format(currentMonthDate, 'MMM yyyy'));
          setShowPayModal(false);
          setSelectedCC(null);
          refreshData();
      } catch (err) {
          console.error(err);
          showToast('Error al procesar pago', 'error');
      } finally {
          setIsPaying(false);
      }
  };

  // --- Computed values ---

  const thisMonthTxs = useMemo(() =>
    transactions.filter(tx => isSameMonth(toJSDate(tx.date), currentMonthDate)),
  [transactions]);

  const creditCardStatementTxs = useMemo(() => {
     return transactions.filter(tx => {
        if (tx.type !== 'expense' || tx.isMSI) return false;
        const acc = accounts.find(a => a.id === tx.accountId);
        if (!acc || acc.type !== 'credit') return false;
        const txDate = toJSDate(tx.date);
        if (acc.cutoffDay) {
             const cutoff = Number(acc.cutoffDay);
             const targetYear = currentMonthDate.getFullYear();
             const targetMonth = currentMonthDate.getMonth();
             const currentStatementCutoff = new Date(targetYear, targetMonth, cutoff);
             currentStatementCutoff.setHours(23, 59, 59, 999);
             const previousStatementCutoff = new Date(targetYear, targetMonth - 1, cutoff);
             previousStatementCutoff.setHours(23, 59, 59, 999);
             return txDate > previousStatementCutoff && txDate <= currentStatementCutoff;
        }
        return isSameMonth(txDate, currentMonthDate);
     });
  }, [transactions, accounts, currentMonthDate]);

  const msiTxs = useMemo(() =>
    transactions.filter(tx => tx.isMSI).map(tx => ({ ...tx, date: toJSDate(tx.date) })),
  [transactions]);

  const currentMsiExpense = calculateMSIForMonth(msiTxs, currentMonthDate);
  const totalMSIDebtActive = msiTxs.reduce((sum, tx) => sum + calculateRemainingMSIDebt(tx), 0);

  const unpaidFixedExpenses = fixedExpenses.reduce((sum, exp) => {
      const paidThisMonthTotal = thisMonthTxs
        .filter(tx => tx.type === 'expense' && tx.fixedExpenseId === exp.id)
        .reduce((acc, tx) => acc + tx.amount, 0);
      const remaining = exp.amount - paidThisMonthTotal;
      return remaining > 0 ? sum + remaining : sum;
  }, 0);

  const creditCards = accounts.filter(a => a.type === 'credit');
  let totalCreditDebt = 0;

  const creditUsage = creditCards.map(cc => {
    const ccTxs = transactions.filter(tx => tx.accountId === cc.id);

    // Fechas de corte (safe contra overflow de meses cortos)
    let lastClosedCutoff;
    if (cc.cutoffDay) {
        const cutoff = Number(cc.cutoffDay);
        const year = currentMonthDate.getFullYear();
        const month = currentMonthDate.getMonth();
        if (currentMonthDate.getDate() < cutoff) {
            const prevMonth = month === 0 ? 11 : month - 1;
            const prevYear = month === 0 ? year - 1 : year;
            lastClosedCutoff = safeCutoffDate(prevYear, prevMonth, cutoff);
        } else {
            lastClosedCutoff = safeCutoffDate(year, month, cutoff);
        }
    } else {
        lastClosedCutoff = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    let prevClosedCutoff;
    if (cc.cutoffDay) {
        const cutoff = Number(cc.cutoffDay);
        const lcMonth = lastClosedCutoff.getMonth();
        const lcYear = lastClosedCutoff.getFullYear();
        const prevMonth = lcMonth === 0 ? 11 : lcMonth - 1;
        const prevYear = lcMonth === 0 ? lcYear - 1 : lcYear;
        prevClosedCutoff = safeCutoffDate(prevYear, prevMonth, cutoff);
    } else {
        prevClosedCutoff = new Date(lastClosedCutoff.getFullYear(), lastClosedCutoff.getMonth(), 0, 23, 59, 59, 999);
    }

    const pastRegularTxs = ccTxs.filter(tx => {
       if (tx.type !== 'expense' || tx.isMSI) return false;
       return toJSDate(tx.date) <= prevClosedCutoff;
    });
    const pastRegularTotal = pastRegularTxs.reduce((sum, tx) => sum + tx.amount, 0);

    const pastPayments = ccTxs.filter(tx => {
        if (tx.type !== 'income') return false;
        return toJSDate(tx.date) <= prevClosedCutoff;
    }).reduce((sum, tx) => sum + tx.amount, 0);

    // Cuotas MSI facturadas ANTES del corte anterior (van al saldo arrastrado)
    const pastMSITotal = ccTxs.filter(tx => tx.isMSI).reduce((acc, tx) => acc + calculateBilledMSISoFar(tx, prevClosedCutoff), 0);
    const pastBalance = Math.max(0, pastRegularTotal + pastMSITotal - pastPayments);

    const currentCycleRegularTxs = ccTxs.filter(tx => {
       if (tx.type !== 'expense' || tx.isMSI) return false;
       const txDate = toJSDate(tx.date);
       return txDate > prevClosedCutoff && txDate <= lastClosedCutoff;
    });
    const currentRegularTotal = currentCycleRegularTxs.reduce((sum, tx) => sum + tx.amount, 0);

    const currentCycleMSITxs = ccTxs
        .filter(tx => tx.type === 'expense' && tx.isMSI)
        .map(tx => ({ ...tx, msiAmountThisMonth: calculateMSIForMonth([tx], lastClosedCutoff) }))
        .filter(tx => tx.msiAmountThisMonth > 0);
    const currentMSITotal = currentCycleMSITxs.reduce((sum, tx) => sum + tx.msiAmountThisMonth, 0);

    const recentPayments = ccTxs.filter(tx => {
        if (tx.type !== 'income') return false;
        return toJSDate(tx.date) > prevClosedCutoff;
    }).reduce((sum, tx) => sum + tx.amount, 0);

    const grossCurrentStatement = pastBalance + currentRegularTotal + currentMSITotal;
    const currentStatementDebt = Math.max(0, grossCurrentStatement - recentPayments);

    // Deuda Total Activa = lo que debes pagar este corte + cuotas MSI que llegarán en meses futuros.
    // msiTotalRemaining incluye el mes actual. Al restarle currentMSITotal obtenemos solo cuotas futuras post-corte.
    const msiTotalRemaining = ccTxs.filter(tx => tx.isMSI).reduce((acc, tx) => acc + calculateRemainingMSIDebt(tx), 0);
    const futureRemainingMSI = Math.max(0, msiTotalRemaining - currentMSITotal);
    const actualDebt = Math.max(0, currentStatementDebt + futureRemainingMSI);
    totalCreditDebt += actualDebt;
    const availableCredit = Math.max(0, cc.creditLimit - actualDebt);
    const usagePercent = cc.creditLimit > 0 ? (actualDebt / cc.creditLimit) * 100 : 0;

    const breakdown = { pastBalance, currentCycleRegularTxs, currentRegularTotal, currentCycleMSITxs, currentMSITotal, grossCurrentStatement, recentPayments };

    const sharedTxs = ccTxs.filter(tx => {
       if (tx.type !== 'expense' || tx.isMSI || !tx.isShared || !tx.borrowerName) return false;
       const txDate = toJSDate(tx.date);
       return txDate > prevClosedCutoff && txDate <= lastClosedCutoff;
    });

    return { ...cc, totalDebt: Math.max(actualDebt, currentStatementDebt), availableCredit, usagePercent, currentStatementDebt, sharedTxs, breakdown };
  });

  const totalCreditStatementDebt = creditUsage.reduce((sum, cc) => sum + cc.currentStatementDebt, 0);
  const avgCreditUsage = creditCards.length > 0
        ? creditUsage.reduce((acc, cc) => acc + cc.usagePercent, 0) / creditCards.length
        : 0;

  const sharedExpensesSummary = useMemo(() => {
     const summary = {};
     creditUsage.forEach(cc => {
         cc.sharedTxs?.forEach(tx => {
             summary[tx.borrowerName] = (summary[tx.borrowerName] || 0) + tx.amount;
         });
     });
     msiTxs.forEach(tx => {
         if (tx.isShared && tx.borrowerName) {
             const msiForThisTxThisMonth = calculateMSIForMonth([tx], currentMonthDate);
             if (msiForThisTxThisMonth > 0) {
                 summary[tx.borrowerName] = (summary[tx.borrowerName] || 0) + msiForThisTxThisMonth;
             }
         }
     });
     return Object.entries(summary).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  }, [creditUsage, msiTxs, currentMonthDate]);

  const totalSharedAmount = sharedExpensesSummary.reduce((sum, item) => sum + item.amount, 0);

  const totalToPayThisMonth = totalCreditStatementDebt + unpaidFixedExpenses;
  const totalCashAndDebit = accounts.filter(a => a.type === 'debit' || a.type === 'cash').reduce((sum, a) => sum + (a.balance || 0), 0);
  const realAvailableBalance = totalCashAndDebit;

  const totalEmergencyFund = savings.filter(s => s.isEmergencyFund).reduce((sum, s) => sum + s.savedAmount, 0);
  const totalSaved = savings.filter(s => !s.isEmergencyFund).reduce((sum, s) => sum + s.savedAmount, 0);

  const recentExpenses = useMemo(() =>
    transactions.filter(tx => tx.type === 'expense').slice(0, 3),
  [transactions]);

  const expensesByCategory = useMemo(() => {
    const debitCashExpenses = thisMonthTxs.filter(tx => {
        if (tx.type !== 'expense' || tx.isMSI) return false;
        const acc = accounts.find(a => a.id === tx.accountId);
        return acc && (acc.type === 'debit' || acc.type === 'cash');
    });
    const categoryMap = {};
    debitCashExpenses.forEach(tx => { categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount; });
    creditCardStatementTxs.forEach(tx => { categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount; });
    msiTxs.forEach(tx => {
        const msiAmt = calculateMSIForMonth([tx], currentMonthDate);
        if (msiAmt > 0) categoryMap[tx.category] = (categoryMap[tx.category] || 0) + msiAmt;
    });
    fixedExpenses.forEach(exp => { categoryMap[exp.category] = (categoryMap[exp.category] || 0) + exp.amount; });
    return Object.entries(categoryMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [thisMonthTxs, creditCardStatementTxs, msiTxs, fixedExpenses, accounts, currentMonthDate]);

  const variableTxsThisMonth = useMemo(() =>
    thisMonthTxs.filter(tx => tx.type === 'expense' && !tx.isMSI && !tx.fixedExpenseId),
  [thisMonthTxs]);

  const variableSpendThisMonth = variableTxsThisMonth.reduce((acc, tx) => acc + tx.amount, 0);

  const burnRateData = useMemo(() =>
    calculateBurnRate(realAvailableBalance, variableSpendThisMonth, currentMonthDate),
  [realAvailableBalance, variableSpendThisMonth, currentMonthDate]);

  const projectedBalanceData = useMemo(() =>
    calculateProjectedBalance(thisMonthTxs, realAvailableBalance, unpaidFixedExpenses, currentMonthDate),
  [thisMonthTxs, realAvailableBalance, unpaidFixedExpenses, currentMonthDate]);

  // --- Render ---

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <LayoutDashboard className="text-primary w-8 h-8" />
              Resumen de {currentMonthDate.toLocaleString('es-MX', { month: 'long' }).toUpperCase()}
            </h1>
            <button
                onClick={() => startTour('dashboard')}
                className="bg-white/5 hover:bg-primary/20 text-text-muted hover:text-primary transition-all p-2 rounded-full border border-white/10"
                title="Ayuda sobre esta pantalla"
            >
                <HelpCircle size={20} />
            </button>
          </div>
          <div className="flex items-center gap-2">
              {userApiKey && (
                 <button
                    onClick={handleClearApiKey}
                    className="p-3 rounded-xl border border-white/5 bg-white/5 text-text-muted hover:text-danger hover:border-danger/30 transition-all opacity-70 hover:opacity-100"
                    title="Borrar mi API KEY guardada"
                 >
                    <KeyRound size={20} />
                 </button>
              )}
              <button
                onClick={() => handleTriggerAI()}
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-90 transition-opacity text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(236,72,153,0.3)] animate-pulse"
              >
                <Sparkles size={20} />
                Analizar Mi Mes con IA
              </button>
          </div>
      </div>

      {/* KPIs */}
      <KPIsGrid
        realAvailableBalance={realAvailableBalance}
        totalToPayThisMonth={totalToPayThisMonth}
        unpaidFixedExpenses={unpaidFixedExpenses}
        totalCreditStatementDebt={totalCreditStatementDebt}
        totalSharedAmount={totalSharedAmount}
        totalEmergencyFund={totalEmergencyFund}
        totalCreditDebt={totalCreditDebt}
        totalMSIDebtActive={totalMSIDebtActive}
        totalSaved={totalSaved}
      />

      {/* Proyecciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex flex-col justify-center">
              <BurnRateIndicator burnRateData={burnRateData} />
          </div>
          <div className="lg:col-span-2">
              <ProjectedBalanceChart data={projectedBalanceData} />
          </div>
      </div>

      {/* Gráfica + Cuentas débito */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-3 xl:col-span-2 bg-surface p-6 rounded-3xl border border-white/5 shadow-lg flex flex-col min-h-[400px]">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <PieIcon className="text-primary" size={24}/> Distribución de Pagos del Mes
            </h2>
            <div className="flex-1 w-full relative">
                {expensesByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <Pie data={expensesByCategory} cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" paddingAngle={5} dataKey="value" stroke="none">
                                {expensesByCategory.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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

        <div className="lg:col-span-3 xl:col-span-1 bg-surface p-6 rounded-3xl border border-white/5 shadow-lg">
             <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Wallet className="text-success" size={24}/> Tu Dinero
            </h2>
            <div className="flex flex-col gap-4">
                {accounts.filter(a => a.type === 'debit' || a.type === 'cash').map(acc => {
                    const activeColorClass = ACCOUNT_COLOR_CLASSES[acc.color] || ACCOUNT_COLOR_CLASSES['default'];
                    return (
                        <div key={acc.id} className={`p-4 rounded-2xl flex justify-between items-center border ${activeColorClass}`}>
                            <span className="font-semibold">{acc.name}</span>
                            <span className="font-black text-success">${acc.balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    );
                })}
                {accounts.filter(a => a.type === 'debit' || a.type === 'cash').length === 0 && (
                     <div className="p-4 text-center text-sm text-text-muted border border-dashed border-white/10 rounded-2xl">
                         No has agregado cuentas de débito o efectivo.
                     </div>
                )}
            </div>

            {sharedExpensesSummary.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/10">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-2">
                        <Wallet size={16} /> Dinero que me deben
                    </h3>
                    <div className="flex flex-col gap-3">
                        {sharedExpensesSummary.map((borrower, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-blue-900/10 border border-blue-500/20 p-3 rounded-xl">
                                <span className="font-semibold text-blue-100">{borrower.name}</span>
                                <span className="font-black text-blue-300">${borrower.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        ))}
                        <div className="flex justify-between items-center px-2 mt-1 text-xs text-text-muted">
                            <span>Suman:</span>
                            <span className="font-bold">${totalSharedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>

      </div>

      {/* Últimos movimientos + Uso de crédito */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">

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
                            const d = toJSDate(tx.date);
                            return (
                                <div key={tx.id} className="p-4 sm:p-5 flex justify-between items-center hover:bg-white/5 transition-colors">
                                    <div className="flex flex-col">
                                        <p className="font-bold text-lg leading-tight">{tx.category}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-text-muted">{d.toLocaleDateString()}</span>
                                            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-md text-text-muted">{acc?.name || 'Tarjeta'}</span>
                                        </div>
                                    </div>
                                    <p className="font-black text-white text-xl">-${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>

        <CreditUsageSection
          creditUsage={creditUsage}
          creditCards={creditCards}
          onPayCard={handleOpenPayModal}
          onBreakdown={(cc) => { setSelectedBreakdownCC(cc); setShowBreakdownModal(true); }}
        />

      </div>

      {/* Modales */}
      {showBreakdownModal && selectedBreakdownCC && (
        <BreakdownModal cc={selectedBreakdownCC} onClose={() => setShowBreakdownModal(false)} />
      )}

      {showPayModal && selectedCC && (
        <PayCardModal
          cc={selectedCC}
          accounts={accounts}
          isPaying={isPaying}
          payAmount={payAmount}
          setPayAmount={setPayAmount}
          selectedDebitId={selectedDebitId}
          setSelectedDebitId={setSelectedDebitId}
          onSubmit={handlePayCreditCard}
          onClose={() => setShowPayModal(false)}
        />
      )}

      {showApiKeyModal && (
        <ApiKeyModal
          apiKeyInput={apiKeyInput}
          setApiKeyInput={setApiKeyInput}
          onSubmit={handleSaveApiKey}
          onClose={() => setShowApiKeyModal(false)}
        />
      )}

      {showAiModal && (
        <AiAdvisorModal
          aiAdvice={aiAdvice}
          isAiLoading={isAiLoading}
          onClose={() => setShowAiModal(false)}
        />
      )}

    </div>
  );
}
