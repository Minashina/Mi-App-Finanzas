import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { deleteTransaction } from '../services/db';
import { List, Trash2, ArrowUpRight, ArrowDownRight, HelpCircle, CheckSquare, Square, Filter } from 'lucide-react';
import { startTour } from '../utils/tourConfig';
import { toJSDate } from '../utils/format';

export default function History() {
  const { transactions, accounts, refreshData } = useFinance();
  const [filterAccountId, setFilterAccountId] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredTxs = useMemo(() => {
    if (!filterAccountId) return transactions;
    return transactions.filter(tx => tx.accountId === filterAccountId);
  }, [transactions, filterAccountId]);

  const handleFilterChange = (accountId) => {
    setFilterAccountId(accountId);
    setSelectedIds(new Set());
  };

  const handleDelete = async (id) => {
    if (confirm("¿Estás seguro de eliminar este registro? Si afectaba el saldo de una cuenta de débito, el dinero será devuelto y reajustado automáticamente.")) {
      await deleteTransaction(id);
      refreshData();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!confirm(`¿Eliminar ${count} registro${count > 1 ? 's' : ''}? Esta acción no se puede deshacer.`)) return;

    setIsDeleting(true);
    for (const id of selectedIds) {
      await deleteTransaction(id);
    }
    setSelectedIds(new Set());
    setSelectMode(false);
    setIsDeleting(false);
    refreshData();
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTxs.length && filteredTxs.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTxs.map(tx => tx.id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const getAccountName = (accountId) => {
    const acc = accounts.find(a => a.id === accountId);
    return acc ? acc.name : 'Desconocida';
  };

  const allSelected = filteredTxs.length > 0 && selectedIds.size === filteredTxs.length;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
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

      {/* Filtro por cuenta */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-text-muted text-sm flex items-center gap-1.5 mr-1">
          <Filter size={14} /> Filtrar:
        </span>
        <button
          onClick={() => handleFilterChange('')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${!filterAccountId ? 'bg-primary text-white border-primary' : 'bg-white/5 border-white/10 text-text-muted hover:border-white/20 hover:text-white'}`}
        >
          Todas las cuentas
        </button>
        {accounts.map(acc => (
          <button
            key={acc.id}
            onClick={() => handleFilterChange(acc.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${filterAccountId === acc.id ? 'bg-primary text-white border-primary' : 'bg-white/5 border-white/10 text-text-muted hover:border-white/20 hover:text-white'}`}
          >
            {acc.name}
          </button>
        ))}
      </div>

      {/* Barra de acciones */}
      <div className="flex items-center justify-between mb-3 min-h-[36px]">
        <span className="text-text-muted text-sm">
          {filteredTxs.length} movimiento{filteredTxs.length !== 1 ? 's' : ''}
          {selectMode && selectedIds.size > 0 && (
            <span className="ml-2 text-primary font-medium">· {selectedIds.size} seleccionado{selectedIds.size > 1 ? 's' : ''}</span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {selectMode && selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-danger text-white rounded-xl font-bold text-sm hover:bg-danger/80 transition-colors disabled:opacity-50"
            >
              <Trash2 size={16} />
              {isDeleting ? 'Eliminando...' : `Eliminar ${selectedIds.size}`}
            </button>
          )}
          <button
            onClick={selectMode ? exitSelectMode : () => setSelectMode(true)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${selectMode ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/10 text-text-muted hover:border-white/20 hover:text-white'}`}
          >
            {selectMode ? 'Cancelar' : 'Seleccionar'}
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-3xl border border-white/5 shadow-xl overflow-hidden">
        {filteredTxs.length === 0 ? (
          <div className="p-10 text-center text-text-muted">
            <List size={48} className="mx-auto mb-4 opacity-20" />
            <p>No hay movimientos para mostrar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table id="tour-hist-table" className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-black/20 text-text-muted text-sm uppercase tracking-wider">
                  {selectMode && (
                    <th className="pl-5 pr-2 py-4 rounded-tl-3xl w-10">
                      <button onClick={toggleSelectAll} className="flex items-center justify-center w-full">
                        {allSelected
                          ? <CheckSquare size={20} className="text-primary" />
                          : <Square size={20} className="opacity-60" />}
                      </button>
                    </th>
                  )}
                  <th className={`px-6 py-4 font-bold ${!selectMode ? 'rounded-tl-3xl' : ''}`}>Fecha</th>
                  <th className="px-6 py-4 font-bold">Resumen / Concepto</th>
                  <th className="px-6 py-4 font-bold">Cuenta</th>
                  <th className="px-6 py-4 font-bold text-center">Tipo</th>
                  <th className="px-6 py-4 font-bold text-right">Monto</th>
                  {!selectMode && <th className="px-6 py-4 rounded-tr-3xl text-center">Acciones</th>}
                  {selectMode && <th className="px-6 py-4 rounded-tr-3xl" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTxs.map(tx => {
                  const isExpense = tx.type === 'expense';
                  const dateObj = toJSDate(tx.date);
                  const formattedDate = dateObj.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
                  const isSelected = selectedIds.has(tx.id);

                  return (
                    <tr
                      key={tx.id}
                      onClick={selectMode ? () => toggleSelect(tx.id) : undefined}
                      className={`transition-colors group ${selectMode ? 'cursor-pointer select-none' : ''} ${isSelected ? 'bg-primary/10' : 'hover:bg-white/5'}`}
                    >
                      {selectMode && (
                        <td className="pl-5 pr-2 py-4">
                          {isSelected
                            ? <CheckSquare size={20} className="text-primary" />
                            : <Square size={20} className="text-text-muted opacity-60" />}
                        </td>
                      )}

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
                            <div className="flex items-center gap-1 text-xs font-bold text-danger bg-danger/10 px-2 py-1 rounded-full">
                              <ArrowDownRight size={14} /> Gasto
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs font-bold text-success bg-success/10 px-2 py-1 rounded-full">
                              <ArrowUpRight size={14} /> Ingreso
                            </div>
                          )}
                        </div>
                      </td>

                      <td className={`px-6 py-4 text-right font-black text-lg whitespace-nowrap ${isExpense ? 'text-white' : 'text-success'}`}>
                        {isExpense ? '-' : '+'}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {!selectMode && (
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="p-2 text-text-muted hover:text-danger hover:bg-danger/20 rounded-lg transition-all mx-auto opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                            title="Eliminar registro"
                          >
                            <Trash2 size={20} />
                          </button>
                        </td>
                      )}
                      {selectMode && <td />}
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
