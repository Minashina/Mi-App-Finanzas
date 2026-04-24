import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { deleteTransaction } from '../services/db';
import { List, Trash2, ArrowUpRight, ArrowDownRight, HelpCircle } from 'lucide-react';
import { startTour } from '../utils/tourConfig';
import { toJSDate } from '../utils/format';

export default function History() {
  const { transactions, accounts, refreshData } = useFinance();

  const handleDelete = async (id) => {
    if (confirm("¿Estás seguro de eliminar este registro? Si afectaba el saldo de una cuenta de débito, el dinero será devuelto y reajustado automáticamente.")) {
      await deleteTransaction(id);
      refreshData();
    }
  };

  const getAccountName = (accountId) => {
    const acc = accounts.find(a => a.id === accountId);
    return acc ? acc.name : 'Desconocida';
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
            <List className="text-primary w-8 h-8" />
            Historial de Movimientos
        </h1>
        <button 
            onClick={() => startTour('history')} 
            className="bg-white/5 hover:bg-primary/20 text-text-muted hover:text-primary transition-all p-2 rounded-full border border-white/10"
            title="Ayuda sobre esta pantalla"
        >
            <HelpCircle size={20} />
        </button>
      </div>

      <div className="bg-surface rounded-3xl border border-white/5 shadow-xl overflow-hidden">
        
        {transactions.length === 0 ? (
          <div className="p-10 text-center text-text-muted">
            <List size={48} className="mx-auto mb-4 opacity-20" />
            <p>No tienes movimientos registrados aún.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table id="tour-hist-table" className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-black/20 text-text-muted text-sm uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold rounded-tl-3xl">Fecha</th>
                  <th className="px-6 py-4 font-bold">Resumen / Concepto</th>
                  <th className="px-6 py-4 font-bold">Cuenta</th>
                  <th className="px-6 py-4 font-bold text-center">Tipo</th>
                  <th className="px-6 py-4 font-bold text-right">Monto</th>
                  <th className="px-6 py-4 rounded-tr-3xl text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map(tx => {
                  const isExpense = tx.type === 'expense';
                  // Las fechas en Firestore son Timestamps
                  const dateObj = toJSDate(tx.date);
                  const formattedDate = dateObj.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
                  
                  return (
                    <tr key={tx.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">{formattedDate}</td>
                      
                      <td className="px-6 py-4">
                        <p className="font-bold">{tx.category}</p>
                        {tx.description && <p className="text-xs text-text-muted mt-1">{tx.description}</p>}
                        {tx.isMSI && (
                          <span className="inline-block mt-2 text-[10px] bg-primary/20 text-primary-light px-2 py-1 rounded-full uppercase font-bold tracking-widest border border-primary/30">
                            {tx.msiData?.totalMonths} Meses s/i
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        <span className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">{getAccountName(tx.accountId)}</span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          {isExpense ? (
                           <div className="flex items-center gap-1 text-xs font-bold text-danger bg-danger/10 px-2 py-1 rounded-full"><ArrowDownRight size={14}/> Gasto</div>
                          ) : (
                           <div className="flex items-center gap-1 text-xs font-bold text-success bg-success/10 px-2 py-1 rounded-full"><ArrowUpRight size={14}/> Ingreso</div>
                          )}
                        </div>
                      </td>

                      <td className={`px-6 py-4 text-right font-black text-lg whitespace-nowrap ${isExpense ? 'text-white' : 'text-success'}`}>
                        {isExpense ? '-' : '+'}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => handleDelete(tx.id)} 
                          className="p-2 text-text-muted hover:text-danger hover:bg-danger/20 rounded-lg transition-all mx-auto opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                          title="Eliminar registro"
                        >
                          <Trash2 size={20} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
