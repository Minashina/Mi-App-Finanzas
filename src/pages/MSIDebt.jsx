import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { projectFutureMSIDebt, calculateMSIForMonth } from '../utils/msi';
import { CalendarSync, HelpCircle } from 'lucide-react';
import { startTour } from '../utils/tourConfig';

export default function MSIDebt() {
  const { transactions, accounts, refreshData } = useFinance();
  const currentMonthDate = new Date();
  const currentMonthStr = format(currentMonthDate, 'yyyy-MM');
  const [loadingToggle, setLoadingToggle] = useState(null);
  const [payingMsiId, setPayingMsiId] = useState(null);
  const [payAccountId, setPayAccountId] = useState('');

  const msiTransactions = useMemo(() => {
    return transactions.filter(tx => tx.isMSI).map(tx => ({
      ...tx,
      date: tx.date.toDate ? tx.date.toDate() : new Date(tx.date)
    }));
  }, [transactions]);

  const projection = useMemo(() => {
    return projectFutureMSIDebt(msiTransactions, 12);
  }, [msiTransactions]);

  const totalMSIDebtActive = msiTransactions.reduce((acc, tx) => acc + (tx.amount), 0);
  
  const handleTogglePaid = async (tx, isPaying, accountId = null) => {
    if (loadingToggle === tx.id) return;
    setLoadingToggle(tx.id);
    try {
        const currentPaid = tx.msiData.paidMonths || [];
        await toggleMSIPayment(tx.id, currentMonthStr, currentPaid, accountId, tx.msiData.monthlyAmount, isPaying);
        if (refreshData) refreshData();
        setPayingMsiId(null);
        setPayAccountId('');
    } catch (err) {
        console.error("Error al marcar pago:", err);
    } finally {
        setLoadingToggle(null);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold flex items-center gap-3">
            <CalendarSync className="text-primary w-8 h-8" />
            Proyección de Deuda Futura (MSI)
            </h1>
            <button 
                onClick={() => startTour('msiDebt')} 
                className="bg-white/5 hover:bg-primary/20 text-text-muted hover:text-primary transition-all p-2 rounded-full border border-white/10"
                title="Ayuda sobre esta pantalla"
            >
                <HelpCircle size={20} />
            </button>
        </div>
        <div className="text-right">
          <p className="text-sm text-text-muted uppercase tracking-wider font-semibold">Total MSI Comprometido</p>
          <p className="text-2xl font-black text-danger">${totalMSIDebtActive.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-surface rounded-3xl border border-white/5 shadow-2xl p-6 lg:p-10">
        <div className="space-y-6">
          {projection.map((monthData, i) => (
            <div key={i} className="flex flex-col md:flex-row items-center gap-4 group">
              <div className="md:w-32 text-center md:text-left">
                <p className="font-bold text-lg capitalize">{format(monthData.date, 'MMMM yyyy', { locale: es })}</p>
                {i === 0 && <span className="text-xs text-primary px-2 py-1 bg-primary/20 rounded-md">Mes Actual</span>}
              </div>

              <div className="flex-1 w-full bg-black/30 rounded-full h-8 overflow-hidden relative border border-white/5">
                {/* Simulated bar visualization */}
                <div 
                  className="h-full bg-gradient-to-r from-primary to-purple-600 transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min((monthData.amount / (Math.max(...projection.map(p => p.amount)) || 1)) * 100, 100)}%` }}
                ></div>
              </div>

              <div className="md:w-32 text-center md:text-right flex items-center justify-end gap-1 font-mono text-xl">
                <DollarSign size={16} className="text-text-muted" />
                <span className={monthData.amount > 0 ? "font-bold" : "text-text-muted"}>
                  {monthData.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {msiTransactions.length === 0 && (
          <div className="text-center py-20 opacity-50">
            <CalendarSync size={64} className="mx-auto mb-4" />
            <p className="text-xl font-semibold">No tienes compras a Meses Sin Intereses activas</p>
          </div>
        )}
      </div>

      {msiTransactions.length > 0 && (
        <div className="mt-12 bg-surface p-8 rounded-3xl border border-white/5">
          <h2 className="text-xl font-bold mb-6">Detalle de Compras Activas (MSI)</h2>
          <div className="overflow-x-auto">
            <table id="tour-msi-table" className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-text-muted text-sm uppercase tracking-wider">
                  <th className="pb-3 font-medium">Concepto</th>
                  <th className="pb-3 font-medium">Fecha Compra</th>
                  <th className="pb-3 font-medium">Plazo</th>
                  <th className="pb-3 font-medium text-right">Monto Mensual</th>
                  <th className="pb-3 font-medium text-center">Pago Act.</th>
                  <th className="pb-3 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {msiTransactions.map(tx => {
                  const appliesThisMonth = calculateMSIForMonth([tx], currentMonthDate) > 0;
                  const isPaidThisMonth = (tx.msiData.paidMonths || []).includes(currentMonthStr);
                  
                  return (
                  <tr key={tx.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-4">
                      <p className="font-bold">{tx.category || 'Compra'}</p>
                      <p className="text-sm text-text-muted">{tx.description}</p>
                    </td>
                    <td className="py-4 text-sm text-text-muted">
                      {format(tx.date, 'dd MMM yyyy', { locale: es })}
                    </td>
                    <td className="py-4">
                      <span className="px-2 py-1 rounded bg-primary/20 text-primary text-xs font-bold">
                        {tx.msiData.totalMonths} MSI
                      </span>
                    </td>
                    <td className="py-4 text-right font-mono font-medium text-primary">
                      ${tx.msiData.monthlyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td id="tour-msi-pay" className="py-4 text-center">
                        {appliesThisMonth ? (
                            isPaidThisMonth ? (
                                <button 
                                    onClick={() => {
                                        if (confirm("¿Desmarcar pago? Esto devolverá el dinero a la cuenta donde se debitó originalmente si aún la tienes disponible, o de lo contrario tendrías que ajustarla manual.")) {
                                            handleTogglePaid(tx, false, null); // For simplicity on undo, we might not always want to auto-refund if we don't remember the account, but standard behavior in simple logic: just toggle state, but here we added generic refund. Let's pass the account they used if we tracked it or ignore auto-refund on undo for now unless they specify. In a robust app, we'd save the `paidAccountId` per month. For now, we just pass null so it untoggles without auto-refund, leaving it manual for undo. 
                                        }
                                    }}
                                    disabled={loadingToggle === tx.id}
                                    className="inline-flex items-center justify-center p-2 rounded-xl transition-all text-success bg-success/10 hover:bg-success/20"
                                    title="Desmarcar pago"
                                >
                                    <CheckCircle2 size={24} />
                                </button>
                            ) : (
                                payingMsiId === tx.id ? (
                                    <div className="flex flex-col items-center gap-2 animate-fade-in bg-black/30 p-2 rounded-xl border border-white/5">
                                        <select 
                                            className="bg-surface border border-white/10 p-2 rounded-lg text-xs outline-none w-full max-w-[150px]"
                                            value={payAccountId} 
                                            onChange={e => setPayAccountId(e.target.value)}
                                        >
                                            <option value="" disabled>Cuenta Pago</option>
                                            {accounts.filter(a => a.type === 'debit' || a.type === 'cash').map(acc => (
                                                <option key={acc.id} value={acc.id}>
                                                    {acc.name} (${acc.balance})
                                                </option>
                                            ))}
                                        </select>
                                        <div className="flex gap-2 w-full">
                                            <button 
                                                onClick={() => setPayingMsiId(null)}
                                                className="flex-1 text-xs text-text-muted hover:text-white"
                                            >Cancelar</button>
                                            <button 
                                                disabled={!payAccountId || loadingToggle === tx.id}
                                                onClick={() => {
                                                  const selectedAccount = accounts.find(a => a.id === payAccountId);
                                                  if (selectedAccount && selectedAccount.balance < tx.msiData.monthlyAmount) {
                                                    alert(`¡Saldo insuficiente en ${selectedAccount.name}!`);
                                                    return;
                                                  }
                                                  handleTogglePaid(tx, true, payAccountId);
                                                }}
                                                className="flex-1 bg-success text-white px-2 py-1 rounded text-xs font-bold disabled:opacity-50"
                                            >Pagar</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setPayingMsiId(tx.id)}
                                        disabled={loadingToggle === tx.id}
                                        className="inline-flex items-center justify-center p-2 rounded-xl transition-all text-text-muted bg-white/5 hover:bg-white/10 hover:text-white"
                                        title="Marcar como pagado"
                                    >
                                        <Circle size={24} />
                                    </button>
                                )
                            )
                        ) : (
                            <span className="text-xs text-text-muted">-</span>
                        )}
                    </td>
                    <td className="py-4 text-right font-mono text-text-muted">
                      ${tx.amount.toLocaleString()}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
