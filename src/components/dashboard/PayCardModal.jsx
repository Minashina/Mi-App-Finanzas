import React from 'react';
import { CreditCard, X } from 'lucide-react';

export default function PayCardModal({ cc, accounts, isPaying, payAmount, setPayAmount, selectedDebitId, setSelectedDebitId, onSubmit, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-surface relative z-10 w-full max-w-md p-8 rounded-3xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="text-primary" /> Pagar Tarjeta
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-white p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-text-muted mb-6">
          Estás a punto de pagar el corte de tu <strong className="text-white">{cc.name}</strong>. Esta acción reducirá tu saldo de débito y el adeudo de esta tarjeta simultáneamente.
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-5">
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
  );
}
