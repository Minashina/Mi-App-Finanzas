import React, { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { projectFutureMSIDebt } from '../utils/msi';
import { CalendarSync, DollarSign, HelpCircle } from 'lucide-react';
import { startTour } from '../utils/tourConfig';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MSIDebt() {
  const { transactions } = useFinance();

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

    </div>
  );
}
