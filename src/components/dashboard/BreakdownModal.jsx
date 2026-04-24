import React from 'react';
import { Receipt, CreditCard, X } from 'lucide-react';

const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function BreakdownModal({ cc, onClose }) {
  const { breakdown, name, currentStatementDebt } = cc;

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-surface relative z-10 w-full max-w-lg p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="text-primary" /> Detalles del Corte
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-white p-2 bg-white/5 rounded-full">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-text-muted mb-6">
          Desglose matemático de cómo se calcula la cantidad a pagar para el corte actual de tu <strong className="text-white">{name}</strong>.
        </p>

        <div className="flex flex-col gap-6">

          {/* Sección 1: Cargos */}
          <div className="bg-black/20 p-4 md:p-5 rounded-2xl border border-white/5">
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider text-primary-light border-b border-white/10 pb-2">1. Resumen de Cargos Facturados</h4>

            <div className="flex justify-between items-center text-sm mb-3">
              <span className="text-text-muted cursor-help" title="Saldo sin liquidar de cortes pasados">Saldo Arrancado de Cortes Anteriores</span>
              <span className="font-medium text-white">${fmt(breakdown.pastBalance)}</span>
            </div>

            <div className="flex flex-col mb-3">
              <div className="flex justify-between items-center text-sm mb-1">
                <span className="text-text-muted">Compras Regulares (Este ciclo)</span>
                <span className="font-medium text-white">${fmt(breakdown.currentRegularTotal)}</span>
              </div>
              {breakdown.currentCycleRegularTxs.length > 0 && (
                <div className="ml-2 pl-2 border-l border-white/10 py-1 space-y-1">
                  {breakdown.currentCycleRegularTxs.map(tx => (
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
                <span className="font-medium text-white">${fmt(breakdown.currentMSITotal)}</span>
              </div>
              {breakdown.currentCycleMSITxs.length > 0 && (
                <div className="ml-2 pl-2 border-l border-white/10 py-1 space-y-1">
                  {breakdown.currentCycleMSITxs.map(tx => (
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
              <span className="font-black text-white text-lg">${fmt(breakdown.grossCurrentStatement)}</span>
            </div>
          </div>

          {/* Sección 2: Abonos */}
          <div className="bg-black/20 p-4 md:p-5 rounded-2xl border border-white/5">
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider text-success border-b border-white/10 pb-2">2. Tus Abonos / Pagos</h4>

            <div className="flex justify-between items-center text-sm">
              <span className="text-text-muted">Pagos hechos DESPUÉS del corte</span>
              <span className="font-black text-success text-xl">-${fmt(breakdown.recentPayments)}</span>
            </div>

            {breakdown.recentPayments > breakdown.grossCurrentStatement && (
              <div className="pt-3 border-t border-white/10 flex justify-between items-center mt-4">
                <div>
                  <span className="font-bold text-blue-400 text-xs block">Aportación Adelantada / Saldo a Favor</span>
                  <span className="text-[10px] text-text-muted leading-tight block mt-0.5">Cubrió todo el corte y el excedente va a deuda total.</span>
                </div>
                <span className="font-black text-blue-400 text-lg">+${fmt(breakdown.recentPayments - breakdown.grossCurrentStatement)}</span>
              </div>
            )}
          </div>

          {/* Sección 3: Total */}
          <div className="bg-danger/10 border border-danger/20 p-5 rounded-2xl flex justify-between items-center shadow-[0_0_20px_rgba(244,63,94,0.1)]">
            <div>
              <span className="font-black text-danger uppercase tracking-wider text-sm flex items-center gap-2"><CreditCard size={18} /> A Pagar este Corte</span>
              <span className="text-xs text-danger/70 mt-1 block">Exigible menos abonos recientes</span>
            </div>
            <span className="font-black text-3xl text-danger">${fmt(currentStatementDebt)}</span>
          </div>

        </div>
      </div>
    </div>
  );
}
