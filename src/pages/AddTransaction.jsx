import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { addTransaction, addCategory, getCustomCategories } from '../services/db';
import { calculateMSIPeriod } from '../utils/msi';
import { PlusCircle, Tag } from 'lucide-react';

const DEFAULT_CATEGORIES = ['Comida', 'Transporte', 'Entretenimiento', 'Salud', 'Servicios', 'Varios'];

export default function AddTransaction() {
  const { accounts, refreshData } = useFinance();
  const [loading, setLoading] = useState(false);
  
  // Categorías Híbridas
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [newCatName, setNewCatName] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);
  
  const [formData, setFormData] = useState({
    accountId: '',
    type: 'expense',
    amount: '',
    category: 'Varios',
    date: new Date().toISOString().slice(0, 10),
    description: '',
    isMSI: false,
    msiMonths: 3
  });

  const selectedAccount = accounts.find(a => a.id === formData.accountId);
  const isCreditCard = selectedAccount?.type === 'credit';

  useEffect(() => {
    // Carga las categorías personalizadas del usuario
    const fetchCats = async () => {
      try {
        const custom = await getCustomCategories();
        // Combinamos las default con las custom usando Set para evitar repetidos
        setCategories([...new Set([...DEFAULT_CATEGORIES, ...custom])]);
      } catch (e) {
        console.error("Error al cargar categorías", e);
      }
    };
    fetchCats();
  }, []);

  const handleAddNewCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      setLoading(true);
      await addCategory(newCatName.trim());
      setCategories(prev => [...new Set([...prev, newCatName.trim()])]);
      setFormData(prev => ({ ...prev, category: newCatName.trim() }));
      setNewCatName('');
      setIsAddingCat(false);
    } catch (err) {
      alert("Error guardando la categoría");
    } finally {
        setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.accountId) {
      alert("Selecciona una cuenta");
      return;
    }

    setLoading(true);
    try {
      const amount = Number(formData.amount);

      // --- BALANCE VALIDATION FOR DEBIT/CASH ACCOUNTS ---
      if (formData.type === 'expense' && selectedAccount && (selectedAccount.type === 'debit' || selectedAccount.type === 'cash')) {
          if (amount > selectedAccount.balance) {
              alert(`¡Saldo insuficiente! Esta cuenta solo tiene $${selectedAccount.balance} disponible.`);
              setLoading(false);
              return;
          }
      }

      const isMSIValid = isCreditCard && formData.type === 'expense' && formData.isMSI;
      const msiMonths = Number(formData.msiMonths);

      const tx = {
        accountId: formData.accountId,
        type: formData.type,
        amount: amount,
        category: formData.category,
        date: new Date(formData.date),
        description: formData.description,
        isMSI: isMSIValid
      };

      if (isMSIValid) {
        const { startMonth, endMonth } = calculateMSIPeriod(tx.date, msiMonths);
        tx.msiData = {
          totalMonths: msiMonths,
          monthlyAmount: amount / msiMonths,
          startMonth,
          endMonth,
          endDate: new Date(new Date(tx.date).setMonth(new Date(tx.date).getMonth() + msiMonths)) // <--- Nueva lógica avanzada V2 explícita
        };
      } else {
        tx.msiData = null;
      }

      await addTransaction(tx);
      setFormData(prev => ({ ...prev, amount: '', description: '', isMSI: false }));
      refreshData();
      alert("Transacción registrada con éxito");
    } catch (err) {
      console.error(err);
      alert("Error al guardar la transacción");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <PlusCircle className="text-primary w-8 h-8" />
        Registrar Movimiento
      </h1>

      <div className="bg-surface p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none"></div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 relative z-10">
          
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-2 font-medium">
              Tipo de Movimiento
              <select 
                className="bg-background border border-white/10 p-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                value={formData.type} 
                onChange={e => setFormData({...formData, type: e.target.value, isMSI: false})}
              >
                <option value="expense">Gasto / Compra</option>
                <option value="income">Ingreso</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 font-medium">
              Cuenta o Tarjeta
              <select 
                required
                className="bg-background border border-white/10 p-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                value={formData.accountId} 
                onChange={e => setFormData({...formData, accountId: e.target.value, isMSI: false})}
              >
                <option value="" disabled>Selecciona una...</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <label className="flex flex-col gap-2 font-medium">
              Monto Total ($)
              <input 
                required type="number" min="0.01" step="0.01"
                className="bg-background border border-white/10 p-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-xl font-bold"
                placeholder="0.00"
                value={formData.amount} 
                onChange={e => setFormData({...formData, amount: e.target.value})} 
              />
            </label>

            <label className="flex flex-col gap-2 font-medium">
              Fecha
              <input 
                required type="date"
                className="bg-background border border-white/10 p-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                value={formData.date} 
                onChange={e => setFormData({...formData, date: e.target.value})} 
              />
            </label>
          </div>

          {/* Categoría Híbrida */}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-2 font-medium">
              Categoría
              {!isAddingCat ? (
                  <div className="flex gap-2">
                    <select 
                        className="flex-1 bg-background border border-white/10 p-3 rounded-xl focus:border-primary outline-none"
                        value={formData.category} 
                        onChange={e => setFormData({...formData, category: e.target.value})}
                    >
                        {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                    <button type="button" onClick={() => setIsAddingCat(true)} className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-primary/20 hover:text-primary transition-all px-4" title="Nueva Categoría">
                        <Tag size={20} />
                    </button>
                  </div>
              ) : (
                  <div className="flex gap-2">
                      <input 
                        type="text" 
                        autoFocus
                        placeholder="Nombre nueva categoría..."
                        className="flex-1 bg-background border border-white/10 p-3 rounded-xl focus:border-primary outline-none"
                        value={newCatName} 
                        onChange={e => setNewCatName(e.target.value)} 
                      />
                      <button type="button" onClick={handleAddNewCategory} disabled={loading} className="p-3 bg-primary text-white rounded-xl font-medium px-4">
                          Crear
                      </button>
                      <button type="button" onClick={() => setIsAddingCat(false)} className="p-3 bg-white/5 border border-white/10 rounded-xl px-4">X</button>
                  </div>
              )}
            </label>

            <label className="flex flex-col gap-2 font-medium">
              Descripción / Concepto
              <input 
                type="text" 
                placeholder="Opcional"
                className="bg-background border border-white/10 p-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
              />
            </label>
          </div>

          {/* Lógica de MSI (Solo para gastos con Tarjeta de Crédito) */}
          {isCreditCard && formData.type === 'expense' && (
            <div className="mt-4 p-5 border border-primary/30 bg-primary/5 rounded-2xl flex flex-col gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 accent-primary rounded cursor-pointer"
                  checked={formData.isMSI} 
                  onChange={e => setFormData({...formData, isMSI: e.target.checked})} 
                />
                <span className="font-bold text-lg text-primary-light">¿Es compra a Meses Sin Intereses (MSI)?</span>
              </label>

              {formData.isMSI && (
                <div className="pl-8 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                  <span className="text-sm text-text-muted">Selecciona el plazo:</span>
                  <div className="flex gap-3">
                    {[3, 6, 9, 12, 18, 24].map(months => (
                      <button
                        type="button"
                        key={months}
                        onClick={() => setFormData({...formData, msiMonths: months})}
                        className={`flex-1 py-2 rounded-lg border font-bold transition-all ${formData.msiMonths === months ? 'bg-primary border-primary text-white shadow-lg' : 'bg-background border-white/10 text-text-muted hover:border-primary/50 hover:text-text'}`}
                      >
                        {months} MSI
                      </button>
                    ))}
                  </div>
                  {formData.amount > 0 && (
                    <p className="mt-2 text-sm text-success">
                      Pagarás <span className="font-bold text-lg">${(formData.amount / formData.msiMonths).toFixed(2)}</span> al mes, tomando el saldo disponible actual pero sin sumar a tu deuda de corte íntegra.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <button 
            disabled={loading}
            className="mt-6 w-full bg-gradient-to-r from-primary to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all disabled:opacity-50"
          >
            {loading ? 'Registrando...' : 'Registrar Movimiento'}
          </button>
        </form>
      </div>
    </div>
  );
}
