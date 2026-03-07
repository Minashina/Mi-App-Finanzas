import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { addAccount, updateAccount, deleteAccount } from '../services/db';
import { CreditCard, Wallet, Landmark, Trash2, CalendarClock, Edit2, Palette } from 'lucide-react';
import { differenceInMonths } from 'date-fns';

const ACCOUNT_COLORS = [
  { name: 'Predeterminado', value: 'default', hex: 'bg-surface border-white/5', baseIcon: 'bg-gray-500' },
  { name: 'Rojo Carmesí', value: 'red', hex: 'bg-red-900/20 border-red-500/30', baseIcon: 'bg-red-500' },
  { name: 'Azul Océano', value: 'blue', hex: 'bg-blue-900/20 border-blue-500/30', baseIcon: 'bg-blue-500' },
  { name: 'Verde Esmeralda', value: 'green', hex: 'bg-green-900/20 border-green-500/30', baseIcon: 'bg-green-500' },
  { name: 'Morado Real', value: 'purple', hex: 'bg-purple-900/20 border-purple-500/30', baseIcon: 'bg-purple-500' },
  { name: 'Naranja Cobre', value: 'orange', hex: 'bg-orange-900/20 border-orange-500/30', baseIcon: 'bg-orange-500' }
];

export default function Accounts() {
  const { accounts, transactions, refreshData } = useFinance();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'debit',
    balance: 0,
    creditLimit: 0,
    cutoffDay: 1,
    paymentDay: 15,
    color: 'default'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const accountToSave = {
        name: formData.name,
        type: formData.type,
        color: formData.color
      };

      if (formData.type === 'debit' || formData.type === 'cash') {
        accountToSave.balance = Number(formData.balance);
      } else if (formData.type === 'credit') {
        accountToSave.creditLimit = Number(formData.creditLimit);
        accountToSave.cutoffDay = Number(formData.cutoffDay);
        accountToSave.paymentDay = Number(formData.paymentDay);
      }

      if (isEditing && editId) {
        await updateAccount(editId, accountToSave);
      } else {
        await addAccount(accountToSave);
      }

      handleCancelEdit();
      refreshData();
    } catch (err) {
      console.error(err);
      alert('Error guardando cuenta');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (acc) => {
    setIsEditing(true);
    setEditId(acc.id);
    setFormData({
      name: acc.name,
      type: acc.type,
      balance: acc.balance || 0,
      creditLimit: acc.creditLimit || 0,
      cutoffDay: acc.cutoffDay || 1,
      paymentDay: acc.paymentDay || 15,
      color: acc.color || 'default'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({ name: '', type: 'debit', balance: 0, creditLimit: 0, cutoffDay: 1, paymentDay: 15, color: 'default' });
  };

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar esta cuenta?')) {
      await deleteAccount(id);
      refreshData();
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'credit': return <CreditCard className="text-primary" />;
      case 'debit': return <Landmark className="text-secondary" />;
      case 'cash': return <Wallet className="text-success" />;
      default: return <CreditCard />;
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <CreditCard className="text-primary w-8 h-8" />
        Mis Tarjetas y Cuentas
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario */}
        <div className="bg-surface p-6 rounded-2xl border border-white/5 shadow-xl h-fit transition-all relative">
          {isEditing && <div className="absolute inset-0 border-2 border-primary/50 rounded-2xl pointer-events-none blur-[2px]"></div>}
          <div className="flex justify-between items-center mb-4 relative z-10">
            <h2 className="text-xl font-semibold">{isEditing ? 'Editar Cuenta' : 'Nueva Cuenta'}</h2>
            {isEditing && (
              <button type="button" onClick={handleCancelEdit} className="text-xs text-text-muted hover:text-white underline">
                Cancelar
              </button>
            )}
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">

            <label className="flex flex-col gap-1 text-sm text-text-muted">
              Nombre (Ej. Nu, BBVA Oro, Billetera)
              <input
                required
                className="bg-background border border-white/10 p-2 rounded-lg text-text focus:outline-none focus:border-primary transition-colors"
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-text-muted">
              Tipo de Cuenta
              <select
                className="bg-background border border-white/10 p-2 rounded-lg text-text focus:outline-none focus:border-primary"
                value={formData.type}
                disabled={isEditing}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="debit">Débito</option>
                <option value="credit">Crédito</option>
                <option value="cash">Efectivo</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm text-text-muted">
              Color Distintivo
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {ACCOUNT_COLORS.map(c => (
                  <button
                    key={c.value} type="button"
                    onClick={() => setFormData({ ...formData, color: c.value })}
                    title={c.name}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${c.baseIcon} ${formData.color === c.value ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.4)] opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  ></button>
                ))}
              </div>
            </label>

            {formData.type === 'credit' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1 text-sm text-text-muted">
                    Día de Corte (1-31)
                    <input
                      required min="1" max="31" type="number"
                      className="bg-background border border-white/10 p-2 rounded-lg"
                      value={formData.cutoffDay} onChange={e => setFormData({ ...formData, cutoffDay: e.target.value })} />
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-text-muted">
                    Día de Pago (1-31)
                    <input
                      required min="1" max="31" type="number"
                      className="bg-background border border-white/10 p-2 rounded-lg"
                      value={formData.paymentDay} onChange={e => setFormData({ ...formData, paymentDay: e.target.value })} />
                  </label>
                </div>
                <label className="flex flex-col gap-1 text-sm text-text-muted">
                  Límite de Crédito ($)
                  <input
                    required min="0" type="number"
                    className="bg-background border border-white/10 p-2 rounded-lg"
                    value={formData.creditLimit} onChange={e => setFormData({ ...formData, creditLimit: e.target.value })} />
                </label>
              </>
            ) : (
              <label className="flex flex-col gap-1 text-sm text-text-muted">
                Saldo Actual ($)
                <input
                  required type="number"
                  disabled={isEditing}
                  title={isEditing ? 'Para modificar el saldo, ingresa un gasto o ingreso desde Registrar Movimiento' : ''}
                  className={`bg-background border border-white/10 p-2 rounded-lg ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  value={formData.balance} onChange={e => setFormData({ ...formData, balance: e.target.value })} />
              </label>
            )}

            <button
              disabled={loading}
              className={`mt-4 text-white py-2 rounded-lg font-medium transition-all disabled:opacity-50 ${isEditing ? 'bg-purple-600 hover:bg-purple-500' : 'bg-primary hover:bg-primary-light'}`}
            >
              {loading ? 'Guardando...' : isEditing ? 'Actualizar Cuenta' : 'Guardar Cuenta'}
            </button>
          </form>
        </div>

        {/* Lista de Cuentas */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {accounts.map(acc => {

            // Buscar compras activas MSI de esta cuenta
            const accountMSIs = acc.type === 'credit'
              ? transactions.filter(tx => tx.accountId === acc.id && tx.isMSI && tx.msiData && tx.msiData.endDate)
              : [];

            const colorObj = ACCOUNT_COLORS.find(c => c.value === acc.color) || ACCOUNT_COLORS[0];
            const activeColorClass = colorObj.hex;

            return (
              <div key={acc.id} className={`p-6 rounded-2xl border relative group overflow-hidden shadow-lg transition-all ${activeColorClass}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-black/30 rounded-xl backdrop-blur-sm">
                      {getIcon(acc.type)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white shadow-sm">{acc.name}</h3>
                      <span className="text-xs text-white/70 uppercase tracking-wider font-semibold">
                        {acc.type === 'credit' ? 'Crédito' : acc.type === 'debit' ? 'Débito' : 'Efectivo'}
                      </span>
                    </div>
                  </div>

                  <div className="flex bg-black/30 rounded-lg backdrop-blur-sm overflow-hidden">
                    <button onClick={() => handleEdit(acc)} className="text-white/60 hover:text-white hover:bg-white/10 transition-colors p-2" title="Editar">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(acc.id)} className="text-white/60 hover:text-danger hover:bg-danger/10 flex-shrink-0 transition-colors p-2" title="Eliminar">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="relative z-10 mt-6 pt-4 border-t border-white/10">
                  {acc.type === 'credit' ? (
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-text-muted">Límite</p>
                        <p className="font-semibold text-lg text-primary">${acc.creditLimit?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-text-muted">Corte/Pago</p>
                        <p className="font-semibold">{acc.cutoffDay} / {acc.paymentDay}</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-text-muted text-sm">Saldo Actual</p>
                      <p className="font-bold text-2xl text-success">${acc.balance?.toLocaleString()}</p>
                    </div>
                  )}

                  {/* Lógica MSI Avanzada para Tarjetas de Crédito */}
                  {accountMSIs.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-dashed border-white/10">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-primary mb-3">
                        <CalendarClock size={16} /> Compras Activas a Plazos (MSI)
                      </h4>
                      <div className="flex flex-col gap-3">
                        {accountMSIs.map(tx => {
                          // endDate guardamos un Date de JS
                          const endDate = tx.msiData.endDate.toDate ? tx.msiData.endDate.toDate() : new Date(tx.msiData.endDate);
                          const monthsLeft = differenceInMonths(endDate, new Date());
                          const progress = Math.min(100, Math.max(0, 100 - (monthsLeft / tx.msiData.totalMonths) * 100));

                          return (
                            <div key={tx.id} className="bg-black/20 p-3 rounded-xl">
                              <div className="flex justify-between text-sm mb-2">
                                <span className="font-medium truncate pr-2" title={tx.description || tx.category}>{tx.description || tx.category}</span>
                                <span className="text-text-muted flex-shrink-0">${tx.amount.toLocaleString()} ({tx.msiData.totalMonths}m)</span>
                              </div>
                              <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden mb-1 relative">
                                <div
                                  className="h-full bg-primary rounded-full transition-all duration-500"
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-text-muted text-right">
                                Te faltan <span className="font-bold text-white">{monthsLeft <= 0 ? 0 : monthsLeft}</span> meses para terminar de pagar.
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )
          })}
          {accounts.length === 0 && (
            <div className="col-span-1 border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-text-muted">
              <CreditCard size={48} className="mb-4 opacity-20" />
              <p>Aún no has registrado ninguna cuenta.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
