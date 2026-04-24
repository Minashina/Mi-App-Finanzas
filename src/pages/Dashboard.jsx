import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { calculateMSIForMonth, calculateRemainingMSIDebt } from '../utils/msi';
import { isSameMonth, format } from 'date-fns';
import { LayoutDashboard, Wallet, Receipt, CalendarSync, Landmark, PieChart as PieIcon, CreditCard, PiggyBank, Clock3, HelpCircle, X, Sparkles, KeyRound } from 'lucide-react';
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

const COLORS = ['#8b5cf6', '#10b981', '#f43f5e', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#8ebd4e'];

const renderBold = (text) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part);
};

// Crea una fecha de corte sin overflow: si el mes tiene menos días que `day`, usa el último día del mes.
// Ejemplo: safeCutoffDate(2026, 1, 30) → 28 feb 2026, no 2 mar 2026.
const safeCutoffDate = (year, month, day) => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(day, lastDay), 23, 59, 59, 999);
};


export default function Dashboard() {
  const { accounts, transactions, fixedExpenses, savings, refreshData } = useFinance();
  const showToast = useToast();
  const currentMonthDate = new Date();

  // UI / Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedCC, setSelectedCC] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [selectedDebitId, setSelectedDebitId] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [selectedBreakdownCC, setSelectedBreakdownCC] = useState(null);

  // AI & API Key State
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
      handleTriggerAI(apiKeyInput.trim()); // Auto-trigger after save
  };

  const handleClearApiKey = () => {
      if(window.confirm('¿Estás seguro de que deseas borrar tu clave de API de este navegador?')) {
          localStorage.removeItem('gemini_api_key');
          setUserApiKey('');
      }
  };

  const handleTriggerAI = async (keyToUse = userApiKey) => {
    if (!keyToUse) {
        setShowApiKeyModal(true);
        return;
    }

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
        // If it's a key error, maybe they want to clear it easily:
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

  // 1. Filtrar Transacciones del Mes
  const thisMonthTxs = useMemo(() => {
    return transactions.filter(tx => 
        isSameMonth(toJSDate(tx.date), currentMonthDate)
    );
  }, [transactions]);

  // 1b. Gastos Regulares de TC que vencen en este "corte" de mes
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
        date: toJSDate(tx.date)
    }));
  }, [transactions]);
  
  const currentMsiExpense = calculateMSIForMonth(msiTxs, currentMonthDate);
  const unpaidMsiExpense = currentMsiExpense;
  
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

  // 5. Status de Crédito & KPI 2 (Deuda Actual Total TC)
  const creditCards = accounts.filter(a => a.type === 'credit');
  let totalCreditDebt = 0;

  const creditUsage = creditCards.map(cc => {
    const ccTxs = transactions.filter(tx => tx.accountId === cc.id);
    
    // Gastos directos de la TC (Histórico completo)
    const regularExpenses = ccTxs.filter(tx => tx.type === 'expense' && !tx.isMSI).reduce((acc, tx) => acc + tx.amount, 0);
    
    // Deuda MSI remanente calculada según factor de tiempo (decaimiento orgánico)
    const msiRemaining = ccTxs.filter(tx => tx.isMSI).reduce((acc, tx) => acc + calculateRemainingMSIDebt(tx), 0);
    
    // Pagos a la TC históricos
    const ccPayments = ccTxs.filter(tx => tx.type === 'income').reduce((acc, tx) => acc + tx.amount, 0);
    
    // Deuda total (Restaurando compatibilidad orgánica sin doble-resta de pagos)
    const unpaidRegularOnly = Math.max(0, regularExpenses - ccPayments);
    const actualDebt = unpaidRegularOnly + msiRemaining;
    
    totalCreditDebt += actualDebt;
    const availableCredit = Math.max(0, cc.creditLimit - actualDebt);
    const usagePercent = cc.creditLimit > 0 ? (actualDebt / cc.creditLimit) * 100 : 0;

    // --- CÁLCULO DE ESTADO DE CUENTA (ÚLTIMO CORTE CERRADO) ---
    let lastClosedCutoff;
    if (cc.cutoffDay) {
        const cutoff = Number(cc.cutoffDay);
        const year = currentMonthDate.getFullYear();
        const month = currentMonthDate.getMonth();
        if (currentMonthDate.getDate() < cutoff) {
            // Aún no llegamos al corte de este mes → el último corte fue el mes anterior
            const prevMonth = month === 0 ? 11 : month - 1;
            const prevYear = month === 0 ? year - 1 : year;
            lastClosedCutoff = safeCutoffDate(prevYear, prevMonth, cutoff);
        } else {
            lastClosedCutoff = safeCutoffDate(year, month, cutoff);
        }
    } else {
        lastClosedCutoff = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Corte anterior: retroceder un mes más desde lastClosedCutoff, cappeando el día
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

    // --- LÓGICA DE ESTADO DE CUENTA (AISLAMIENTO TEMPORAL) ---
    // 1. Histórico (Anteriores al corte)
    const pastRegularTxs = ccTxs.filter(tx => {
       if (tx.type !== 'expense' || tx.isMSI) return false;
       const txDate = toJSDate(tx.date);
       return txDate <= prevClosedCutoff;
    });
    const pastRegularTotal = pastRegularTxs.reduce((sum, tx) => sum + tx.amount, 0);

    // Pagos previos al ciclo (hasta la fecha de cierre previa)
    const pastPayments = ccTxs.filter(tx => {
        if (tx.type !== 'income') return false;
        const txDate = toJSDate(tx.date);
        return txDate <= lastClosedCutoff;
    }).reduce((sum, tx) => sum + tx.amount, 0);

    // Saldo histórico arrastrado (se traga el exceso de abonos al vacío MSI)
    const pastBalance = Math.max(0, pastRegularTotal - pastPayments);

    // 2. Facturado en el ciclo actual
    const currentCycleRegularTxs = ccTxs.filter(tx => {
       if (tx.type !== 'expense' || tx.isMSI) return false;
       const txDate = toJSDate(tx.date);
       return txDate > prevClosedCutoff && txDate <= lastClosedCutoff;
    });
    const currentRegularTotal = currentCycleRegularTxs.reduce((sum, tx) => sum + tx.amount, 0);

    const currentCycleMSITxs = ccTxs.filter(tx => tx.type === 'expense' && tx.isMSI)
        .map(tx => ({...tx, msiAmountThisMonth: calculateMSIForMonth([tx], lastClosedCutoff)}))
        .filter(tx => tx.msiAmountThisMonth > 0);
    const currentMSITotal = currentCycleMSITxs.reduce((sum, tx) => sum + tx.msiAmountThisMonth, 0);

    // 3. Pagos Recientes (Abonos hechos DESPUÉS del corte)
    const recentPayments = ccTxs.filter(tx => {
        if (tx.type !== 'income') return false;
        const txDate = toJSDate(tx.date);
        return txDate > lastClosedCutoff;
    }).reduce((sum, tx) => sum + tx.amount, 0);

    // 4. Saldo a Pagar este Corte
    const grossCurrentStatement = pastBalance + currentRegularTotal + currentMSITotal;
    let currentStatementDebt = Math.max(0, grossCurrentStatement - recentPayments);

    const breakdown = {
        pastBalance,
        currentCycleRegularTxs,
        currentRegularTotal,
        currentCycleMSITxs,
        currentMSITotal,
        grossCurrentStatement,
        recentPayments
    };

    // Identificar gastos compartidos del corte actual
    const sharedTxs = ccTxs.filter(tx => {
       if (tx.type !== 'expense' || tx.isMSI || !tx.isShared || !tx.borrowerName) return false;
       const txDate = toJSDate(tx.date);
       return txDate > prevClosedCutoff && txDate <= lastClosedCutoff;
    });

    return { ...cc, totalDebt: Math.max(actualDebt, currentStatementDebt), availableCredit, usagePercent, currentStatementDebt, sharedTxs, breakdown };
  });

  // SUMAR EL STATEMENT DEBT DE TODAS LAS TARJETAS PARA EL CÁLCULO
  const totalCreditStatementDebt = creditUsage.reduce((sum, cc) => sum + cc.currentStatementDebt, 0);
  
  // Calculate average credit usage for AI
  const avgCreditUsage = creditCards.length > 0 
        ? creditUsage.reduce((acc, cc) => acc + cc.usagePercent, 0) / creditCards.length 
        : 0;

  // AGRUPAR LOS GASTOS COMPARTIDOS DEL MES
  const sharedExpensesSummary = useMemo(() => {
     const summary = {};
     creditUsage.forEach(cc => {
         if (cc.sharedTxs) {
             cc.sharedTxs.forEach(tx => {
                 const name = tx.borrowerName;
                 summary[name] = (summary[name] || 0) + tx.amount;
             });
         }
     });
     
     // Además, checamos los MSI compartidos activos este mes (si hubieran)
     msiTxs.forEach(tx => {
         if (tx.isShared && tx.borrowerName) {
             const msiForThisTxThisMonth = calculateMSIForMonth([tx], currentMonthDate);
             if (msiForThisTxThisMonth > 0) {
                 const name = tx.borrowerName;
                 summary[name] = (summary[name] || 0) + msiForThisTxThisMonth;
             }
         }
     });

     return Object.entries(summary).map(([name, amount]) => ({ name, amount })).sort((a,b) => b.amount - a.amount);
  }, [creditUsage, msiTxs, currentMonthDate]);

  const totalSharedAmount = sharedExpensesSummary.reduce((sum, item) => sum + item.amount, 0);

  // KPI 1: Total a Pagar Este Mes
  const totalToPayThisMonth = totalCreditStatementDebt + unpaidFixedExpenses;

  // KPI 4: Saldo Disponible Real (Líquido)
  const totalCashAndDebit = accounts
    .filter(a => a.type === 'debit' || a.type === 'cash')
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  const realAvailableBalance = totalCashAndDebit;

  // KPI 5 & Fondo de Emergencia
  const emergencyFunds = savings.filter(s => s.isEmergencyFund);
  const totalEmergencyFund = emergencyFunds.reduce((sum, s) => sum + s.savedAmount, 0);
  const totalSaved = savings.filter(s => !s.isEmergencyFund).reduce((sum, s) => sum + s.savedAmount, 0);

  // Widget: Últimos 3 (gastos)
  const recentExpenses = useMemo(() => {
    return transactions.filter(tx => tx.type === 'expense').slice(0, 3);
  }, [transactions]);

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

  // PROJECTIONS CALCULATION
  const variableTxsThisMonth = useMemo(() => {
      return thisMonthTxs.filter(tx => tx.type === 'expense' && !tx.isMSI && !tx.fixedExpenseId);
  }, [thisMonthTxs]);
  
  const variableSpendThisMonth = variableTxsThisMonth.reduce((acc, tx) => acc + tx.amount, 0);
  
  const burnRateData = useMemo(() => {
      return calculateBurnRate(realAvailableBalance, variableSpendThisMonth, currentMonthDate);
  }, [realAvailableBalance, variableSpendThisMonth, currentMonthDate]);

  const projectedBalanceData = useMemo(() => {
      return calculateProjectedBalance(thisMonthTxs, realAvailableBalance, unpaidFixedExpenses, currentMonthDate);
  }, [thisMonthTxs, realAvailableBalance, unpaidFixedExpenses, currentMonthDate]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      
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

      {/* 6 KPIs Financieros (Top Level) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
        
        {/* KPI: Saldo Disponible Real */}
        <div id="tour-balance" className="bg-gradient-to-br from-primary to-purple-800 p-6 rounded-3xl shadow-lg relative overflow-hidden text-white flex flex-col justify-between">
            <div className="absolute right-4 top-4 opacity-20"><Landmark size={48} /></div>
            <div>
                <p className="text-white/80 mb-1 text-xs font-bold uppercase tracking-widest">Saldo Disponible Real</p>
                <p className="text-4xl font-black">${realAvailableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <p className="text-xs text-white/60 mt-4 leading-tight">
                Dinero libre en débito/efectivo.
            </p>
        </div>

        {/* KPI: Total a Pagar Este Mes */}
        <div id="tour-topay" className="bg-surface p-6 rounded-3xl border border-white/5 shadow-lg relative overflow-hidden flex flex-col justify-between group hover:border-danger/30 transition-colors">
            <div className="absolute right-4 top-4 opacity-10 group-hover:opacity-20 transition-opacity text-danger"><Receipt size={48} /></div>
            <div>
                <p className="text-text-muted mb-1 text-xs font-bold uppercase tracking-widest">A Pagar este Mes</p>
                <p className="text-3xl font-black text-danger">${totalToPayThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="mt-4 text-xs font-medium text-text-muted space-y-1">
                <div className="flex justify-between"><span>Gastos Fijos:</span> <span>${unpaidFixedExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between"><span>Tarjetas de Crédito:</span> <span>${totalCreditStatementDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                {totalSharedAmount > 0 && (
                     <div className="mt-2 text-[10px] text-blue-400 border-t border-white/5 pt-2">
                         (De los cuales <strong className="text-blue-300">${totalSharedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> te los deben tus amigos)
                     </div>
                )}
            </div>
        </div>

        {/* KPI: Fondo de Emergencia */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-900 p-6 rounded-3xl shadow-lg relative overflow-hidden text-white flex flex-col justify-between">
            <div className="absolute right-4 top-4 opacity-20"><Wallet size={48} /></div>
            <div>
                <p className="text-white/80 mb-1 text-xs font-bold uppercase tracking-widest">Fondo de Emergencia</p>
                <p className="text-4xl font-black text-blue-300">${totalEmergencyFund.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <p className="text-xs text-white/60 mt-4 leading-tight">
                Tu colchón financiero (ideal: 3 meses de sueldo).
            </p>
        </div>

        {/* KPI: Deuda TC */}
        <div id="tour-credit" className="bg-surface p-6 rounded-3xl border border-white/5 shadow-lg relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-4 top-4 opacity-5"><CreditCard size={48} /></div>
            <div>
                <p className="text-text-muted mb-1 text-xs font-bold uppercase tracking-widest">Deuda Actual Total</p>
                <p className="text-3xl font-black text-white">${totalCreditDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <p className="text-xs text-text-muted mt-4 leading-tight">
                Sumatoria de deudas activas en todas tus tarjetas de crédito.
            </p>
        </div>

        {/* KPI: MSI Activos totales */}
        <div id="tour-msi" className="bg-surface p-6 rounded-3xl border border-white/5 shadow-lg relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-4 top-4 opacity-5"><CalendarSync size={48} /></div>
            <div>
                <p className="text-text-muted mb-1 text-xs font-bold uppercase tracking-widest">Deuda MSI Activa</p>
                <p className="text-3xl font-black text-primary-light">${totalMSIDebtActive.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <p className="text-xs text-text-muted mt-4 leading-tight">
                Saldo total comprometido a meses sin intereses a futuro.
            </p>
        </div>

        {/* KPI: Total Ahorrado */}
        <div id="tour-savings" className="bg-surface p-6 rounded-3xl border border-white/5 shadow-lg relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-4 top-4 opacity-5"><PiggyBank size={48} /></div>
            <div>
                <p className="text-text-muted mb-1 text-xs font-bold uppercase tracking-widest">Total Ahorrado</p>
                <p className="text-3xl font-black text-success">${totalSaved.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <p className="text-xs text-text-muted mt-4 leading-tight">
                Capital total protegido en tus metas (excl. colchón).
            </p>
        </div>

      </div>

      {/* PROYECCIONES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex flex-col justify-center">
              <BurnRateIndicator burnRateData={burnRateData} />
          </div>
          <div className="lg:col-span-2">
              <ProjectedBalanceChart data={projectedBalanceData} />
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

        {/* Cuentas Débito Listado Sidebar */}
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
            
            {/* Dinero que me deben (Widget Inferior de Sidebar) */}
            {sharedExpensesSummary.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/10">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-2">
                        <Wallet size={16} /> Dinero que me deben
                    </h3>
                    <div className="flex flex-col gap-3">
                        {sharedExpensesSummary.map((borrower, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-blue-900/10 border border-blue-500/20 p-3 rounded-xl">
                                <span className="font-semibold text-blue-100">{borrower.name}</span>
                                <span className="font-black text-blue-300">
                                    ${borrower.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
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
                                    <div className="text-right">
                                        <p className="font-black text-white text-xl">-${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
                    const activeColorClass = ACCOUNT_COLOR_CLASSES[cc.color] || ACCOUNT_COLOR_CLASSES['default'];
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
                        <span className="font-bold text-lg">${cc.totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div className="mb-4 flex flex-col md:flex-row gap-4 justify-between items-center text-sm bg-danger/10 p-4 rounded-xl border border-danger/20">
                        <div>
                            <span className="text-danger font-bold text-xs uppercase tracking-wide block mb-1">A Pagar este Corte</span>
                            <span className="font-black text-2xl text-danger">${cc.currentStatementDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex flex-col gap-2 w-full md:w-auto">
                            {cc.currentStatementDebt > 0 || cc.totalDebt > 0 ? (
                                <button 
                                    onClick={() => handleOpenPayModal(cc)}
                                    className="bg-danger hover:bg-red-700 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-lg hover:scale-105 w-full"
                                >
                                    Pagar Tarjeta
                                </button>
                            ) : (
                                 <span className="bg-success text-white font-bold py-2 px-6 rounded-xl w-full text-center block">¡Pagada!</span>
                            )}
                            <button
                                onClick={() => { setSelectedBreakdownCC(cc); setShowBreakdownModal(true); }}
                                className="text-danger hover:text-red-400 font-bold text-xs uppercase tracking-wide transition-colors text-center w-full mt-1"
                            >
                                Ver Desglose
                            </button>
                        </div>
                    </div>
                    
                    <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden mb-2 relative">
                    <div 
                        className={`h-full rounded-full transition-all duration-1000 ${cc.usagePercent > 80 ? 'bg-danger' : cc.usagePercent > 50 ? 'bg-yellow-500' : 'bg-success'}`}
                        style={{ width: `${Math.min(cc.usagePercent, 100)}%` }}
                    ></div>
                    </div>

                    <div className="flex justify-between text-xs text-text-muted font-medium">
                        <span>Disp: <strong className="text-white">${cc.availableCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                        <span>Límite: ${cc.creditLimit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({cc.usagePercent.toFixed(1)}%)</span>
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

      {/* Modal Desglose del Corte */}
      {showBreakdownModal && selectedBreakdownCC && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBreakdownModal(false)}></div>
          <div className="bg-surface relative z-10 w-full max-w-lg p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Receipt className="text-primary" /> Detalles del Corte
              </h3>
              <button onClick={() => setShowBreakdownModal(false)} className="text-text-muted hover:text-white p-2 bg-white/5 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-sm text-text-muted mb-6">
              Desglose matemático de cómo se calcula la cantidad a pagar para el corte actual de tu <strong className="text-white">{selectedBreakdownCC.name}</strong>.
            </p>

            <div className="flex flex-col gap-6">
                
                {/* SECCIÓN 1: Total Facturado */}
                <div className="bg-black/20 p-4 md:p-5 rounded-2xl border border-white/5">
                    <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider text-primary-light border-b border-white/10 pb-2">1. Resumen de Cargos Facturados</h4>
                    
                    <div className="flex justify-between items-center text-sm mb-3">
                        <span className="text-text-muted cursor-help" title="Saldo sin liquidar de cortes pasados">Saldo Arrancado de Cortes Anteriores</span>
                        <span className="font-medium text-white">${selectedBreakdownCC.breakdown.pastBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    
                    <div className="flex flex-col mb-3">
                        <div className="flex justify-between items-center text-sm mb-1">
                            <span className="text-text-muted">Compras Regulares (Este ciclo)</span>
                            <span className="font-medium text-white">${selectedBreakdownCC.breakdown.currentRegularTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        {selectedBreakdownCC.breakdown.currentCycleRegularTxs.length > 0 && (
                            <div className="ml-2 pl-2 border-l border-white/10 py-1 space-y-1">
                                {selectedBreakdownCC.breakdown.currentCycleRegularTxs.map(tx => (
                                    <div key={tx.id} className="flex justify-between text-xs text-text-muted/70">
                                        <span className="truncate pr-2">{tx.description || tx.category}</span>
                                        <span>${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex flex-col mb-4">
                        <div className="flex justify-between items-center text-sm mb-1">
                            <span className="text-text-muted">Meses Sin Intereses (Este ciclo)</span>
                            <span className="font-medium text-white">${selectedBreakdownCC.breakdown.currentMSITotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        {selectedBreakdownCC.breakdown.currentCycleMSITxs.length > 0 && (
                            <div className="ml-2 pl-2 border-l border-white/10 py-1 space-y-1">
                                {selectedBreakdownCC.breakdown.currentCycleMSITxs.map(tx => (
                                    <div key={tx.id} className="flex justify-between text-xs text-text-muted/70">
                                        <span className="truncate pr-2">{tx.description || tx.category} ({tx.msiData?.totalMonths} MSI)</span>
                                        <span>${tx.msiAmountThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="pt-3 border-t border-white/10 flex justify-between items-center bg-white/5 -mx-4 -mb-4 p-4 rounded-b-2xl mt-2">
                        <span className="font-bold text-white text-sm">Suma Exigible del Corte</span>
                        <span className="font-black text-white text-lg">${selectedBreakdownCC.breakdown.grossCurrentStatement.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>

                {/* SECCIÓN 2: Abonos */}
                <div className="bg-black/20 p-4 md:p-5 rounded-2xl border border-white/5">
                    <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider text-success border-b border-white/10 pb-2">2. Tus Abonos / Pagos</h4>
                    
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-text-muted">Pagos hechos DESPUÉS del corte</span>
                        <span className="font-black text-success text-xl">-${selectedBreakdownCC.breakdown.recentPayments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    {selectedBreakdownCC.breakdown.recentPayments > selectedBreakdownCC.breakdown.grossCurrentStatement && (
                        <div className="pt-3 border-t border-white/10 flex justify-between items-center mt-4">
                            <div>
                                <span className="font-bold text-blue-400 text-xs block">Aportación Adelantada / Saldo a Favor</span>
                                <span className="text-[10px] text-text-muted leading-tight block mt-0.5">Cubrió todo el corte y el excedente va a deuda total.</span>
                            </div>
                            <span className="font-black text-blue-400 text-lg">+${(selectedBreakdownCC.breakdown.recentPayments - selectedBreakdownCC.breakdown.grossCurrentStatement).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    )}
                </div>

                {/* SECCIÓN 3: Total */}
                <div className="bg-danger/10 border border-danger/20 p-5 rounded-2xl flex justify-between items-center shadow-[0_0_20px_rgba(244,63,94,0.1)]">
                    <div>
                        <span className="font-black text-danger uppercase tracking-wider text-sm flex items-center gap-2"><CreditCard size={18}/> A Pagar este Corte</span>
                        <span className="text-xs text-danger/70 mt-1 block">Exigible menos abonos recientes</span>
                    </div>
                    <span className="font-black text-3xl text-danger">${selectedBreakdownCC.currentStatementDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pagar Tarjeta */}
      {showPayModal && selectedCC && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPayModal(false)}></div>
          <div className="bg-surface relative z-10 w-full max-w-md p-8 rounded-3xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <CreditCard className="text-primary" /> Pagar Tarjeta
              </h3>
              <button onClick={() => setShowPayModal(false)} className="text-text-muted hover:text-white p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-sm text-text-muted mb-6">
              Estás a punto de pagar el corte de tu <strong className="text-white">{selectedCC.name}</strong>. Esta acción reducirá tu saldo de débito y el adeudo de esta tarjeta simultáneamente.
            </p>

            <form onSubmit={handlePayCreditCard} className="flex flex-col gap-5">
              <label className="flex flex-col gap-2 font-medium">
                Pagar desde (Débito/Efectivo)
                <select 
                  required
                  className="bg-background border border-white/10 p-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  value={selectedDebitId} 
                  onChange={e => setSelectedDebitId(e.target.value)}
                >
                  <option value="" disabled>Selecciona cuenta origen...</option>
                  {accounts.filter(a => a.type === 'debit' || a.type === 'cash').map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (${acc.balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 font-medium">
                Monto a Pagar ($)
                <input 
                  required type="number" step="0.01" min="0.01"
                  className="bg-background border border-white/10 p-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-xl font-bold text-success"
                  value={payAmount} 
                  onChange={e => setPayAmount(e.target.value)} 
                />
              </label>

              <button 
                disabled={isPaying}
                className="mt-4 w-full bg-gradient-to-r from-success to-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all disabled:opacity-50"
              >
                {isPaying ? 'Procesando...' : 'Confirmar Pago'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal API KEY request */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowApiKeyModal(false)}></div>
          <div className="bg-surface relative z-10 w-full max-w-md p-8 rounded-3xl border border-pink-500/30 shadow-[0_0_50px_rgba(236,72,153,0.15)] animate-in fade-in zoom-in-95 duration-200">
             <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold flex items-center gap-2 text-pink-400">
                <KeyRound /> Configurar Asesor IA
              </h3>
              <button onClick={() => setShowApiKeyModal(false)} className="text-text-muted hover:text-white p-2">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-sm text-text-muted mb-6">
              Para usar el asesor de IA de forma gratuita para ti, necesitas proporcionar tu propia clave mágica de <strong>Google Gemini API</strong>. 
              <br/><br/>
              Esta clave se guardará <strong>solo en tu navegador actual</strong> y no se comparte con nadie más.
            </p>

            <form onSubmit={handleSaveApiKey} className="flex flex-col gap-5">
              <label className="flex flex-col gap-2 font-medium">
                Pega tu "API KEY" aquí:
                <input 
                  required type="password" 
                  placeholder="AIzaSyA..."
                  className="bg-background border border-white/10 p-3 rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all font-mono"
                  value={apiKeyInput} 
                  onChange={e => setApiKeyInput(e.target.value)} 
                />
              </label>

              <button 
                type="submit"
                className="w-full bg-pink-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-pink-500 transition-colors shadow-lg"
              >
                Guardar y Analizar Mi Mes
              </button>

              <div className="text-center mt-2">
                 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline">
                     ¿No tienes una? Consíguela gratis aquí.
                 </a>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Asesor IA */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAiModal(false)}></div>
          <div className="bg-surface relative z-10 w-full max-w-lg p-8 rounded-3xl border border-pink-500/20 shadow-[0_0_50px_rgba(236,72,153,0.1)] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold flex items-center gap-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
                <Sparkles className="text-pink-400" /> Mi Asesor IA
              </h3>
              <button 
                onClick={() => setShowAiModal(false)} 
                className="text-text-muted hover:text-white p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                disabled={isAiLoading}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="bg-background/50 border border-white/5 rounded-2xl p-6 min-h-[200px] flex flex-col justify-center">
                {isAiLoading ? (
                    <div className="flex flex-col items-center justify-center gap-4 h-full py-8 text-pink-400">
                         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
                         <p className="animate-pulse font-medium text-center">Analizando tus movimientos del mes...<br/><span className="text-xs text-text-muted">Generando recomendaciones precisas</span></p>
                    </div>
                ) : (
                    <div className="prose prose-invert prose-p:leading-relaxed max-w-none text-sm md:text-base">
                        {aiAdvice ? (
                           aiAdvice.split('\n').map((line, i) => {
                               if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                                   const text = line.replace(/^[-*]\s/, '');
                                   return <div key={i} className="flex gap-3 mb-4 last:mb-0 bg-white/5 p-4 rounded-xl items-start">
                                       <span className="text-pink-400 mt-1">•</span>
                                       <span>{renderBold(text)}</span>
                                   </div>
                               }
                               if (line.trim() !== "") {
                                   return <p key={i} className="mb-4">{renderBold(line)}</p>
                               }
                               return null;
                           })
                        ) : (
                           <p className="text-center text-danger">No se pudo cargar el análisis.</p>
                        )}
                    </div>
                )}
            </div>

            <p className="text-[10px] text-center text-text-muted mt-6 opacity-60">
                Los consejos de IA están generados con Gemini de acuerdo a tus saldos y deudas actuales, agrupados y asegurados privadamente sin comprometer información externa conectable.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
