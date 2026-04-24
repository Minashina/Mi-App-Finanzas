import React from 'react';
import { Landmark, Receipt, Wallet, CreditCard, CalendarSync, PiggyBank } from 'lucide-react';

const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function KPIsGrid({
  realAvailableBalance,
  totalToPayThisMonth,
  unpaidFixedExpenses,
  totalCreditStatementDebt,
  totalSharedAmount,
  totalEmergencyFund,
  totalCreditDebt,
  totalMSIDebtActive,
  totalSaved,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">

      <div id="tour-balance" className="bg-gradient-to-br from-primary to-purple-800 p-6 rounded-3xl shadow-lg relative overflow-hidden text-white flex flex-col justify-between">
          <div className="absolute right-4 top-4 opacity-20"><Landmark size={48} /></div>
          <div>
              <p className="text-white/80 mb-1 text-xs font-bold uppercase tracking-widest">Saldo Disponible Real</p>
              <p className="text-4xl font-black">${fmt(realAvailableBalance)}</p>
          </div>
          <p className="text-xs text-white/60 mt-4 leading-tight">Dinero libre en débito/efectivo.</p>
      </div>

      <div id="tour-topay" className="bg-surface p-6 rounded-3xl border border-white/5 shadow-lg relative overflow-hidden flex flex-col justify-between group hover:border-danger/30 transition-colors">
          <div className="absolute right-4 top-4 opacity-10 group-hover:opacity-20 transition-opacity text-danger"><Receipt size={48} /></div>
          <div>
              <p className="text-text-muted mb-1 text-xs font-bold uppercase tracking-widest">A Pagar este Mes</p>
              <p className="text-3xl font-black text-danger">${fmt(totalToPayThisMonth)}</p>
          </div>
          <div className="mt-4 text-xs font-medium text-text-muted space-y-1">
              <div className="flex justify-between"><span>Gastos Fijos:</span> <span>${fmt(unpaidFixedExpenses)}</span></div>
              <div className="flex justify-between"><span>Tarjetas de Crédito:</span> <span>${fmt(totalCreditStatementDebt)}</span></div>
              {totalSharedAmount > 0 && (
                   <div className="mt-2 text-[10px] text-blue-400 border-t border-white/5 pt-2">
                       (De los cuales <strong className="text-blue-300">${fmt(totalSharedAmount)}</strong> te los deben tus amigos)
                   </div>
              )}
          </div>
      </div>

      <div className="bg-gradient-to-br from-blue-900 to-indigo-900 p-6 rounded-3xl shadow-lg relative overflow-hidden text-white flex flex-col justify-between">
          <div className="absolute right-4 top-4 opacity-20"><Wallet size={48} /></div>
          <div>
              <p className="text-white/80 mb-1 text-xs font-bold uppercase tracking-widest">Fondo de Emergencia</p>
              <p className="text-4xl font-black text-blue-300">${fmt(totalEmergencyFund)}</p>
          </div>
          <p className="text-xs text-white/60 mt-4 leading-tight">Tu colchón financiero (ideal: 3 meses de sueldo).</p>
      </div>

      <div id="tour-credit" className="bg-surface p-6 rounded-3xl border border-white/5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="absolute right-4 top-4 opacity-5"><CreditCard size={48} /></div>
          <div>
              <p className="text-text-muted mb-1 text-xs font-bold uppercase tracking-widest">Deuda Actual Total</p>
              <p className="text-3xl font-black text-white">${fmt(totalCreditDebt)}</p>
          </div>
          <p className="text-xs text-text-muted mt-4 leading-tight">Sumatoria de deudas activas en todas tus tarjetas de crédito.</p>
      </div>

      <div id="tour-msi" className="bg-surface p-6 rounded-3xl border border-white/5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="absolute right-4 top-4 opacity-5"><CalendarSync size={48} /></div>
          <div>
              <p className="text-text-muted mb-1 text-xs font-bold uppercase tracking-widest">Deuda MSI Activa</p>
              <p className="text-3xl font-black text-primary-light">${fmt(totalMSIDebtActive)}</p>
          </div>
          <p className="text-xs text-text-muted mt-4 leading-tight">Saldo total comprometido a meses sin intereses a futuro.</p>
      </div>

      <div id="tour-savings" className="bg-surface p-6 rounded-3xl border border-white/5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="absolute right-4 top-4 opacity-5"><PiggyBank size={48} /></div>
          <div>
              <p className="text-text-muted mb-1 text-xs font-bold uppercase tracking-widest">Total Ahorrado</p>
              <p className="text-3xl font-black text-success">${fmt(totalSaved)}</p>
          </div>
          <p className="text-xs text-text-muted mt-4 leading-tight">Capital total protegido en tus metas (excl. colchón).</p>
      </div>

    </div>
  );
}
