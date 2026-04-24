import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { calculateMSIForMonth, calculateRemainingMSIDebt } from '../utils/msi';
import { differenceInCalendarMonths, parseISO } from 'date-fns';
import { toJSDate } from '../utils/format';
import { FileText, Copy, Check } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const safeCutoffDate = (year, month, day) => {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay), 23, 59, 59, 999);
};

export default function Statement() {
  const { accounts, transactions, fixedExpenses, savings } = useFinance();
  const showToast = useToast();
  const [copied, setCopied] = useState(false);
  const today = new Date();

  // ── Cuentas débito/efectivo ──────────────────────────────────────────────
  const debitAccounts = accounts.filter(a => a.type === 'debit' || a.type === 'cash');
  const totalCashDebit = debitAccounts.reduce((s, a) => s + (a.balance || 0), 0);

  // ── MSI activos ─────────────────────────────────────────────────────────
  const msiTxs = useMemo(() =>
    transactions.filter(tx => tx.isMSI && tx.msiData),
  [transactions]);

  const activeMSI = useMemo(() => msiTxs.map(tx => {
    const remaining = calculateRemainingMSIDebt(tx);
    const endDate = toJSDate(tx.msiData.endDate);
    const monthsLeft = remaining > 0
      ? Math.min(differenceInCalendarMonths(endDate, today) + 1, tx.msiData.totalMonths)
      : 0;
    const acc = accounts.find(a => a.id === tx.accountId);
    return { ...tx, remaining, monthsLeft, accountName: acc?.name || 'Desconocida' };
  }).filter(tx => tx.remaining > 0), [msiTxs, accounts]);

  // ── Tarjetas de crédito ──────────────────────────────────────────────────
  const creditCards = accounts.filter(a => a.type === 'credit');

  const creditUsage = useMemo(() => creditCards.map(cc => {
    const ccTxs = transactions.filter(tx => tx.accountId === cc.id);

    let lastClosedCutoff;
    if (cc.cutoffDay) {
      const cutoff = Number(cc.cutoffDay);
      const year = today.getFullYear(), month = today.getMonth();
      if (today.getDate() < cutoff) {
        const pm = month === 0 ? 11 : month - 1;
        const py = month === 0 ? year - 1 : year;
        lastClosedCutoff = safeCutoffDate(py, pm, cutoff);
      } else {
        lastClosedCutoff = safeCutoffDate(year, month, cutoff);
      }
    } else {
      lastClosedCutoff = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    let prevClosedCutoff;
    if (cc.cutoffDay) {
      const cutoff = Number(cc.cutoffDay);
      const lcm = lastClosedCutoff.getMonth(), lcy = lastClosedCutoff.getFullYear();
      const pm = lcm === 0 ? 11 : lcm - 1;
      const py = lcm === 0 ? lcy - 1 : lcy;
      prevClosedCutoff = safeCutoffDate(py, pm, cutoff);
    } else {
      prevClosedCutoff = new Date(lastClosedCutoff.getFullYear(), lastClosedCutoff.getMonth(), 0, 23, 59, 59, 999);
    }

    const pastRegular = ccTxs.filter(tx => tx.type === 'expense' && !tx.isMSI && toJSDate(tx.date) <= prevClosedCutoff).reduce((s, tx) => s + tx.amount, 0);
    const pastPayments = ccTxs.filter(tx => tx.type === 'income' && toJSDate(tx.date) <= prevClosedCutoff).reduce((s, tx) => s + tx.amount, 0);
    const pastBalance = Math.max(0, pastRegular - pastPayments);

    const currentRegular = ccTxs.filter(tx => tx.type === 'expense' && !tx.isMSI && toJSDate(tx.date) > prevClosedCutoff && toJSDate(tx.date) <= lastClosedCutoff).reduce((s, tx) => s + tx.amount, 0);
    const currentMSITotal = ccTxs.filter(tx => tx.isMSI).reduce((s, tx) => s + calculateMSIForMonth([{ ...tx, date: toJSDate(tx.date) }], lastClosedCutoff), 0);
    const recentPayments = ccTxs.filter(tx => tx.type === 'income' && toJSDate(tx.date) > prevClosedCutoff).reduce((s, tx) => s + tx.amount, 0);

    const currentStatementDebt = Math.max(0, pastBalance + currentRegular + currentMSITotal - recentPayments);
    const msiAtCutoff = ccTxs.filter(tx => tx.isMSI).reduce((s, tx) => s + calculateRemainingMSIDebt(tx, lastClosedCutoff), 0);
    const futureRemainingMSI = Math.max(0, msiAtCutoff - currentMSITotal);
    const openCycleRegular = ccTxs.filter(tx => tx.type === 'expense' && !tx.isMSI && toJSDate(tx.date) > lastClosedCutoff).reduce((s, tx) => s + tx.amount, 0);
    const totalDebt = Math.max(0, currentStatementDebt + futureRemainingMSI + openCycleRegular);
    const usagePercent = cc.creditLimit > 0 ? Math.round((totalDebt / cc.creditLimit) * 100) : 0;

    return { ...cc, currentStatementDebt, totalDebt, usagePercent };
  }), [creditCards, transactions, today]);

  const totalStatementDebt = creditUsage.reduce((s, cc) => s + cc.currentStatementDebt, 0);
  const totalCreditDebt = creditUsage.reduce((s, cc) => s + cc.totalDebt, 0);

  // ── Gastos fijos ─────────────────────────────────────────────────────────
  const totalFixed = fixedExpenses.reduce((s, e) => s + e.amount, 0);

  // ── Ahorros ──────────────────────────────────────────────────────────────
  const goalSavings = savings.filter(s => !s.isEmergencyFund);
  const emergencyFund = savings.filter(s => s.isEmergencyFund);
  const totalSaved = goalSavings.reduce((s, g) => s + g.savedAmount, 0);
  const totalEmergency = emergencyFund.reduce((s, g) => s + g.savedAmount, 0);

  // ── Gastos últimos 30 días por categoría ─────────────────────────────────
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentExpensesByCategory = useMemo(() => {
    const map = {};
    transactions.filter(tx => tx.type === 'expense' && toJSDate(tx.date) >= thirtyDaysAgo).forEach(tx => {
      const amount = tx.isMSI ? (tx.msiData?.monthlyAmount || 0) : tx.amount;
      map[tx.category] = (map[tx.category] || 0) + amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  // ── Últimas 20 transacciones ─────────────────────────────────────────────
  const recentTxs = useMemo(() =>
    [...transactions].sort((a, b) => toJSDate(b.date) - toJSDate(a.date)).slice(0, 20),
  [transactions]);

  // ── Generar texto del estado de cuenta ──────────────────────────────────
  const statementText = useMemo(() => {
    const dateStr = today.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    const lines = [];

    lines.push('=== ESTADO DE CUENTA PERSONAL ===');
    lines.push(`Fecha: ${dateStr}`);
    lines.push('');

    lines.push('--- RESUMEN GENERAL ---');
    lines.push(`Saldo disponible (débito/efectivo): ${fmt(totalCashDebit)}`);
    lines.push(`Total a pagar este corte (tarjetas + fijos): ${fmt(totalStatementDebt + totalFixed)}`);
    lines.push(`Deuda total activa en crédito: ${fmt(totalCreditDebt)}`);
    lines.push(`Total ahorrado (metas): ${fmt(totalSaved)}`);
    lines.push(`Fondo de emergencia: ${fmt(totalEmergency)}`);
    lines.push('');

    if (debitAccounts.length > 0) {
      lines.push('--- CUENTAS DE DÉBITO / EFECTIVO ---');
      debitAccounts.forEach(a => {
        lines.push(`${a.name}: ${fmt(a.balance || 0)}`);
      });
      lines.push('');
    }

    if (creditUsage.length > 0) {
      lines.push('--- TARJETAS DE CRÉDITO ---');
      creditUsage.forEach(cc => {
        lines.push(`${cc.name} (Límite: ${fmt(cc.creditLimit || 0)})`);
        lines.push(`  A pagar este corte: ${fmt(cc.currentStatementDebt)}`);
        lines.push(`  Deuda total activa: ${fmt(cc.totalDebt)}`);
        lines.push(`  Crédito disponible: ${fmt(Math.max(0, (cc.creditLimit || 0) - cc.totalDebt))}`);
        lines.push(`  Uso del límite: ${cc.usagePercent}%`);
      });
      lines.push('');
    }

    if (activeMSI.length > 0) {
      lines.push('--- PLANES A MESES SIN INTERESES (MSI) ACTIVOS ---');
      activeMSI.forEach(tx => {
        lines.push(`${tx.category} — ${tx.accountName}`);
        lines.push(`  Compra original: ${fmt(tx.amount)} | Mensualidad: ${fmt(tx.msiData.monthlyAmount)}`);
        lines.push(`  Plan: ${tx.msiData.totalMonths} meses | Meses restantes: ${tx.monthsLeft} | Resta pagar: ${fmt(tx.remaining)}`);
        if (tx.description) lines.push(`  Detalle: ${tx.description}`);
      });
      lines.push('');
    }

    if (fixedExpenses.length > 0) {
      lines.push('--- GASTOS FIJOS MENSUALES ---');
      fixedExpenses.forEach(e => {
        lines.push(`${e.name} (${e.category}): ${fmt(e.amount)}`);
      });
      lines.push(`Total fijos: ${fmt(totalFixed)}`);
      lines.push('');
    }

    if (goalSavings.length > 0 || emergencyFund.length > 0) {
      lines.push('--- AHORROS Y METAS ---');
      emergencyFund.forEach(g => {
        lines.push(`Fondo de emergencia: ${fmt(g.savedAmount)} / ${fmt(g.targetAmount || 0)}`);
      });
      goalSavings.forEach(g => {
        const pct = g.targetAmount > 0 ? Math.round((g.savedAmount / g.targetAmount) * 100) : 0;
        lines.push(`${g.name}: ${fmt(g.savedAmount)} / ${fmt(g.targetAmount || 0)} (${pct}%)`);
      });
      lines.push('');
    }

    if (recentExpensesByCategory.length > 0) {
      lines.push('--- GASTOS POR CATEGORÍA (ÚLTIMOS 30 DÍAS) ---');
      recentExpensesByCategory.forEach(([cat, amount]) => {
        lines.push(`${cat}: ${fmt(amount)}`);
      });
      lines.push('');
    }

    if (recentTxs.length > 0) {
      lines.push('--- ÚLTIMAS 20 TRANSACCIONES ---');
      recentTxs.forEach(tx => {
        const accName = accounts.find(a => a.id === tx.accountId)?.name || 'Desconocida';
        const d = toJSDate(tx.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
        const tipo = tx.type === 'expense' ? 'Gasto' : 'Ingreso';
        const msiTag = tx.isMSI ? ` [MSI ${tx.msiData?.totalMonths}m]` : '';
        lines.push(`${d} | ${tipo} | ${tx.category}${msiTag} | ${accName} | ${fmt(tx.amount)}`);
        if (tx.description) lines.push(`       Detalle: ${tx.description}`);
      });
      lines.push('');
    }

    lines.push('=== FIN DEL ESTADO DE CUENTA ===');
    return lines.join('\n');
  }, [debitAccounts, creditUsage, activeMSI, fixedExpenses, goalSavings, emergencyFund, recentExpensesByCategory, recentTxs, accounts]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(statementText);
      setCopied(true);
      showToast('¡Estado de cuenta copiado!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('No se pudo copiar. Selecciónalo manualmente.', 'error');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FileText className="text-primary w-8 h-8" />
          Estado de Cuenta
        </h1>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${copied ? 'bg-success text-white' : 'bg-primary hover:bg-primary/80 text-white'}`}
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>

      <p className="text-text-muted text-sm mb-6">
        Copia este resumen y pégalo en cualquier IA (ChatGPT, Claude, Gemini…) para obtener un análisis personalizado de tus finanzas.
      </p>

      <div className="bg-surface rounded-2xl border border-white/5 shadow-xl p-5 md:p-8 overflow-x-auto">
        <pre className="text-xs md:text-sm text-text-muted font-mono leading-relaxed whitespace-pre-wrap break-words select-all">
          {statementText}
        </pre>
      </div>
    </div>
  );
}
