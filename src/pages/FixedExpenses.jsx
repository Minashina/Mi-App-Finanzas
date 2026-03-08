import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { addFixedExpense, deleteFixedExpense, addTransaction } from '../services/db';
import { CalendarClock, PlusCircle, Trash2, Home, Wifi, Zap, Droplets, CheckCircle2, ArrowRight } from 'lucide-react';
import { isSameMonth } from 'date-fns';

export default function FixedExpenses() {
  const { fixedExpenses, accounts, transactions, refreshData, globalMonth: currentMonthDate } = useFinance();
  const [loading, setLoading] = useState(false);
  const [payLoadingId, setPayLoadingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: 'Vivienda'
  });

  const [displayAmount, setDisplayAmount] = useState('');

  const [payData, setPayData] = useState({ accountId: '', amount: '' });
  const [payDisplayAmount, setPayDisplayAmount] = useState('');

  const handleAmountChange = (e, setter, displaySetter) => {
      // Remove everything except numbers and decimal point
      const rawValue = e.target.value.replace(/[^0-9.]/g, '');
      
      // Prevent multiple decimal points
      const parts = rawValue.split('.');
      if (parts.length > 2) return;
      
      setter(rawValue);

      // Format for display
      if (rawValue === '') {
          displaySetter('');
          return;
      }

      if (parts.length === 2) {
          // Has decimal part
          const formattedInt = new Intl.NumberFormat('en-US').format(parts[0] || '0');
          displaySetter(`${formattedInt}.${parts[1]}`);
      } else {
          // No decimal part
          displaySetter(new Intl.NumberFormat('en-US').format(rawValue));
      }
  };
  const [payingExpenseId, setPayingExpenseId] = useState(null);

  const categories = ['Vivienda', 'Servicios', 'Suscripciones', 'Seguros', 'Educación', 'Otros'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) return;

    setLoading(true);
    try {
      await addFixedExpense({
        name: formData.name,
        amount: Number(formData.amount),
        category: formData.category
      });
      setFormData({ name: '', amount: '', category: 'Vivienda' });
      setDisplayAmount('');
      refreshData();
    } catch (err) {
      console.error(err);
      alert('Error al guardar el gasto fijo');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("¿Seguro que deseas eliminar este gasto fijo? Ya no se sumará a tus pagos del mes.")) {
      await deleteFixedExpense(id);
      refreshData();
    }
  };

  const handlePayExpense = async (e, exp) => {
      e.preventDefault();
      if (!payData.accountId) {
          alert("Selecciona una cuenta para pagar");
          return;
      }
      
      setPayLoadingId(exp.id);
      try {
          const payAmount = Number(payData.amount);
          if (payAmount <= 0) {
              alert("El monto debe ser mayor a 0");
              setPayLoadingId(null);
              return;
          }

          const selectedAccount = accounts.find(a => a.id === payData.accountId);
          if (selectedAccount && (selectedAccount.type === 'debit' || selectedAccount.type === 'cash')) {
              if (payAmount > selectedAccount.balance) {
                  alert(`¡Saldo insuficiente! Esta cuenta solo tiene $${selectedAccount.balance} disponible.`);
                  setPayLoadingId(null);
                  return;
              }
          }

          const txDate = isSameMonth(currentMonthDate, new Date())
             ? new Date()
             : new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 15, 12);

          const tx = {
              accountId: payData.accountId,
              type: 'expense',
              amount: payAmount,
              category: exp.category,
              date: txDate,
              description: `Pago Fijo: ${exp.name}`,
              isMSI: false,
              msiData: null,
              fixedExpenseId: exp.id // Vinculación clave
          };

          await addTransaction(tx);
          setPayingExpenseId(null);
          setPayData({ accountId: '', amount: '' });
          setPayDisplayAmount('');
          refreshData();
      } catch (err) {
          console.error(err);
          alert("Error al procesar el pago");
      } finally {
          setPayLoadingId(null);
      }
  };

  const getIcon = (category) => {
    switch(category) {
      case 'Vivienda': return <Home size={20} className="text-blue-400" />;
      case 'Servicios': return <Zap size={20} className="text-yellow-400" />;
      case 'Suscripciones': return <Wifi size={20} className="text-purple-400" />;
      default: return <Droplets size={20} className="text-teal-400" />;
    }
  };

  const totalFixed = fixedExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CalendarClock className="text-primary w-8 h-8" />
            Gastos Fijos
          </h1>
          <div className="bg-surface border border-white/10 px-6 py-3 rounded-2xl shadow-lg">
              <p className="text-xs text-text-muted uppercase tracking-wider font-bold mb-1">Total Fijo Mensual</p>
              <p className="text-2xl font-black text-danger">${totalFixed.toLocaleString()}</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulario */}
        <div className="bg-surface p-6 rounded-3xl border border-white/5 shadow-xl h-fit">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <PlusCircle className="text-primary" /> Agregar Gasto Fijo
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            <label className="flex flex-col gap-2 font-medium">
              Concepto (Ej. Renta, Netflix, Luz)
              <input 
                required
                type="text"
                placeholder="Nombre del gasto"
                className="bg-background border border-white/10 p-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
              />
            </label>

            <label className="flex flex-col gap-2 font-medium">
              Monto Mensual ($)
              <input 
                required type="text" inputMode="decimal"
                placeholder="0.00"
                className="bg-background border border-white/10 p-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-lg font-bold"
                value={displayAmount} 
                onChange={e => handleAmountChange(e, (val) => setFormData({...formData, amount: val}), setDisplayAmount)} 
              />
            </label>

            <label className="flex flex-col gap-2 font-medium">
              Categoría
              <select 
                className="bg-background border border-white/10 p-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                value={formData.category} 
                onChange={e => setFormData({...formData, category: e.target.value})}
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <button 
              disabled={loading}
              className="mt-4 w-full bg-gradient-to-r from-primary to-purple-600 text-white py-3 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Agregar Gasto'}
            </button>
          </form>
        </div>

        {/* Lista de Gastos Fijos */}
        <div className="lg:col-span-2">
            <div className="bg-surface rounded-3xl border border-white/5 shadow-xl overflow-hidden">
                {fixedExpenses.length === 0 ? (
                    <div className="p-10 text-center text-text-muted">
                        <CalendarClock size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No tienes gastos fijos registrados.</p>
                        <p className="text-sm">Agrega tu renta, servicios o suscripciones para tomarlos en cuenta en tu cálculo mensual.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {fixedExpenses.map(exp => {
                            // Revisar cuánto ya se pagó este mes
                            const amountPaidThisMonth = transactions
                                .filter(tx => tx.fixedExpenseId === exp.id && tx.type === 'expense' && isSameMonth(tx.date.toDate ? tx.date.toDate() : new Date(tx.date), currentMonthDate))
                                .reduce((acc, tx) => acc + tx.amount, 0);

                            const remainingAmount = exp.amount - amountPaidThisMonth;
                            const isFullyPaidThisMonth = remainingAmount <= 0;
                            const isPartiallyPaid = amountPaidThisMonth > 0 && !isFullyPaidThisMonth;

                            return (
                            <div key={exp.id} className="p-4 sm:p-6 hover:bg-white/5 transition-colors group flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl shadow-inner hidden sm:block ${isFullyPaidThisMonth ? 'bg-success/20 text-success' : (isPartiallyPaid ? 'bg-primary/20 text-primary' : 'bg-background')}`}>
                                            {isFullyPaidThisMonth ? <CheckCircle2 size={20} /> : getIcon(exp.category)}
                                        </div>
                                        <div>
                                            <h3 className={`font-bold text-lg ${isFullyPaidThisMonth ? 'text-text-muted line-through' : ''}`}>{exp.name}</h3>
                                            <p className="text-xs text-text-muted uppercase tracking-wider">{exp.category}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <span className={`font-black text-xl ${isFullyPaidThisMonth ? 'text-success' : ''}`}>${exp.amount.toLocaleString()}</span>
                                            {isFullyPaidThisMonth && <p className="text-[10px] text-success font-bold uppercase">Pagado</p>}
                                            {isPartiallyPaid && <p className="text-[10px] text-primary font-bold uppercase">Abonado: ${amountPaidThisMonth.toLocaleString()}</p>}
                                        </div>
                                        <button 
                                            onClick={() => handleDelete(exp.id)} 
                                            className="p-2 text-text-muted hover:text-danger hover:bg-danger/20 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                            title="Eliminar Gasto Fijo"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Zona de Pago (Si no está pagado total) */}
                                {!isFullyPaidThisMonth && (
                                    <div className="border-t border-white/5 pt-3 mt-1 flex justify-end">
                                        {payingExpenseId === exp.id ? (
                                            <form onSubmit={(e) => handlePayExpense(e, exp)} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 w-full animate-fade-in bg-black/20 p-3 rounded-xl border border-white/5">
                                                <div className="flex-1 flex flex-col sm:flex-row gap-3">
                                                    <label className="flex-1 flex flex-col gap-1 text-xs font-bold text-text-muted">
                                                        Pago desde:
                                                        <select 
                                                            required
                                                            className="bg-surface border border-white/10 p-2 rounded-lg text-white outline-none"
                                                            value={payData.accountId} onChange={e => setPayData({ ...payData, accountId: e.target.value })}
                                                        >
                                                            <option value="" disabled>Selecciona cuenta o tarjeta</option>
                                                            {accounts.map(acc => (
                                                                <option key={acc.id} value={acc.id}>
                                                                    {acc.name} {acc.type === 'debit' || acc.type === 'cash' ? `(Disp: $${acc.balance})` : '(Crédito)'}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </label>
                                                    
                                                    <label className="sm:max-w-[124px] flex flex-col gap-1 text-xs font-bold text-text-muted">
                                                        Monto a Pagar ($)
                                                        <input 
                                                            required type="text" inputMode="decimal"
                                                            className="bg-surface border border-white/10 p-2 rounded-lg text-white font-bold outline-none"
                                                            value={payDisplayAmount} 
                                                            onChange={e => {
                                                                handleAmountChange(e, (val) => setPayData({...payData, amount: val}), setPayDisplayAmount);
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        type="button" onClick={() => setPayingExpenseId(null)}
                                                        className="flex-1 sm:flex-none text-text-muted hover:text-white p-2 text-xs font-bold underline h-[38px] flex justify-center items-center"
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button 
                                                        disabled={payLoadingId === exp.id}
                                                        type="submit" 
                                                        className="flex-1 sm:flex-none bg-success text-white px-4 rounded-lg hover:bg-success/80 transition-colors h-[38px] flex justify-center items-center disabled:opacity-50 font-bold gap-2 text-sm"
                                                    >
                                                        {payLoadingId === exp.id ? '...' : 'Pagar'}
                                                    </button>
                                                </div>
                                            </form>
                                        ) : (
                                            <button 
                                                onClick={() => {
                                                    setPayingExpenseId(exp.id);
                                                    setPayData({ accountId: '', amount: remainingAmount.toString() }); 
                                                    setPayDisplayAmount(new Intl.NumberFormat('en-US').format(remainingAmount));
                                                }}
                                                className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-light bg-primary/10 px-4 py-2 rounded-lg transition-colors"
                                            >
                                                {isPartiallyPaid ? 'Abonar cantidad pendiente' : 'Marcar como Pagado / Abonar este mes'}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )})}
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}
