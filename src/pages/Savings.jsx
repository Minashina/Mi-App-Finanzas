import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { addSavingGoal, addFundsToSaving } from '../services/db';
import { differenceInWeeks, differenceInMonths, isValid, parseISO } from 'date-fns';
import { PiggyBank, Target, CalendarDays, Plus, PlusCircle, Wallet, ArrowRight } from 'lucide-react';

export default function Savings() {
  const { savings, accounts, refreshData } = useFinance();
  const [loading, setLoading] = useState(false);
  const [fundingLoading, setFundingLoading] = useState(false);

  // Form para nueva meta
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    deadline: '',
    frequency: 'Mensual'
  });

  // Estado para el mini-form de fondear meta
  const [fundingGoalId, setFundingGoalId] = useState(null);
  const [fundData, setFundData] = useState({
    accountId: '',
    amount: ''
  });

  const debitAccounts = accounts.filter(a => a.type === 'debit' || a.type === 'cash');

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.targetAmount || !formData.deadline) return;

    setLoading(true);
    try {
      await addSavingGoal({
        name: formData.name,
        targetAmount: Number(formData.targetAmount),
        savedAmount: 0,
        deadline: new Date(formData.deadline),
        frequency: formData.frequency
      });
      setFormData({ name: '', targetAmount: '', deadline: '', frequency: 'Mensual' });
      refreshData();
    } catch (err) {
      console.error(err);
      alert('Error al crear la meta de ahorro');
    } finally {
      setLoading(false);
    }
  };

  const handleFundSubmit = async (e, goalId) => {
    e.preventDefault();
    if (!fundData.accountId || !fundData.amount) return;
    
    // Verificar si hay fondos suficientes
    const account = accounts.find(a => a.id === fundData.accountId);
    if (!account || account.balance < Number(fundData.amount)) {
      alert("No tienes suficientes fondos en esta cuenta para realizar esta aportación.");
      return;
    }

    setFundingLoading(true);
    try {
      await addFundsToSaving(goalId, fundData.accountId, Number(fundData.amount));
      setFundingGoalId(null);
      setFundData({ accountId: '', amount: '' });
      refreshData();
    } catch (err) {
      console.error(err);
      alert('Error al transferir fondos al ahorro');
    } finally {
      setFundingLoading(false);
    }
  };

  // Calcula cuánto hay que dar por pago según la frecuencia elegida
  const calculateQuota = (target, saved, deadline, freq) => {
    const remaining = target - saved;
    if (remaining <= 0) return 0;
    
    // Check Date format (firestore returns timestamps, react input returns string)
    const end = deadline.toDate ? deadline.toDate() : new Date(deadline);
    const today = new Date();
    
    let periods = 1;
    if (freq === 'Semanal') {
       periods = differenceInWeeks(end, today);
    } else if (freq === 'Quincenal') {
       periods = differenceInWeeks(end, today) / 2;
    } else {
       periods = differenceInMonths(end, today);
    }

    // Para evitar divisions por 0 o números negativos si ya expiró el tiempo
    periods = Math.max(1, Math.ceil(periods));
    
    return remaining / periods;
  };

  const totalSavedAll = savings.reduce((acc, s) => acc + s.savedAmount, 0);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <PiggyBank className="text-primary w-8 h-8" />
            Metas de Ahorro
          </h1>
          <div className="bg-surface border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-lg">
             <div>
                <p className="text-xs text-text-muted uppercase tracking-wider font-bold mb-1">Total Ahorrado</p>
                <p className="text-3xl font-black text-white">${totalSavedAll.toLocaleString()}</p>
             </div>
             <div className="bg-primary/20 p-3 rounded-xl ml-2">
                 <Target className="text-primary-light" size={24} />
             </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formulario para Crear Meta */}
        <div className="bg-surface p-6 rounded-3xl border border-white/5 shadow-xl h-fit">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <PlusCircle className="text-primary" /> Nueva Meta
          </h2>
          <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
            
            <label className="flex flex-col gap-2 font-medium text-sm">
              Nombre de la Meta
              <input 
                required type="text" placeholder="Ej. Viaje a Japón, Auto nuevo..."
                className="bg-background border border-white/10 p-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
              />
            </label>

            <label className="flex flex-col gap-2 font-medium text-sm">
              Monto Objetivo ($)
              <input 
                required type="number" min="1" step="0.01" placeholder="Ej. 50000"
                className="bg-background border border-white/10 p-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-lg font-bold"
                value={formData.targetAmount} onChange={e => setFormData({...formData, targetAmount: e.target.value})} 
              />
            </label>

            <label className="flex flex-col gap-2 font-medium text-sm">
              Fecha Límite
              <input 
                required type="date"
                className="bg-background border border-white/10 p-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} 
              />
            </label>

            <label className="flex flex-col gap-2 font-medium text-sm">
              Frecuencia de Ahorro
              <p className="text-[10px] text-text-muted leading-tight mb-1">Te sugeriremos cuánto apartar basado en tu frecuencia y fecha límite.</p>
              <select 
                className="bg-background border border-white/10 p-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value})}
              >
                <option value="Semanal">Semanal</option>
                <option value="Quincenal">Quincenal</option>
                <option value="Mensual">Mensual</option>
              </select>
            </label>

            <button 
              disabled={loading}
              className="mt-4 w-full bg-primary text-white py-3 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Meta'}
            </button>
          </form>
        </div>

        {/* Listado de Metas */}
        <div className="lg:col-span-2 space-y-6">
            
            {savings.length === 0 ? (
                <div className="bg-surface rounded-3xl border border-white/5 shadow-xl p-10 text-center text-text-muted">
                    <Target size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No tienes metas de ahorro activas.</p>
                    <p className="text-sm">Empieza a planear tu futuro creando una meta hoy.</p>
                </div>
            ) : (
                savings.map(goal => {
                    const quota = calculateQuota(goal.targetAmount, goal.savedAmount, goal.deadline, goal.frequency);
                    const progress = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
                    const isCompleted = progress >= 100;
                    
                    return (
                        <div key={goal.id} className="bg-surface rounded-3xl border border-white/5 shadow-xl overflow-hidden p-6 transition-all hover:border-white/10">
                            
                            {/* Cabecera Meta */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 gap-4">
                                <div>
                                    <h3 className="text-2xl font-bold mb-1 flex items-center gap-2">
                                        {goal.name} {isCompleted && <span className="text-xs bg-success/20 text-success px-2 py-1 rounded-full uppercase tracking-widest">¡Logrado!</span>}
                                    </h3>
                                    <p className="text-text-muted text-sm font-medium">Meta: ${goal.targetAmount.toLocaleString()}</p>
                                </div>
                                <div className="text-left md:text-right">
                                    <p className="text-xs text-text-muted uppercase tracking-wider font-bold mb-1">Acumulado</p>
                                    <p className={`text-3xl font-black ${isCompleted ? 'text-success' : 'text-primary-light'}`}>
                                        ${goal.savedAmount.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Barra Progreso */}
                            <div className="w-full bg-black/40 rounded-full h-4 overflow-hidden mb-6 relative">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-success' : 'bg-primary'}`}
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-background rounded-xl p-3 border border-white/5">
                                    <p className="text-[10px] text-text-muted uppercase font-bold mb-1">Sugerencia</p>
                                    <p className="font-bold text-sm">{isCompleted ? '-' : `$${quota.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})} / ${goal.frequency.toLowerCase()}`}</p>
                                </div>
                                <div className="bg-background rounded-xl p-3 border border-white/5">
                                    <p className="text-[10px] text-text-muted uppercase font-bold mb-1">Fecha Límite</p>
                                    <p className="font-bold text-sm flex items-center xl:whitespace-nowrap gap-1">
                                        <CalendarDays size={14}/> 
                                        {(() => {
                                            const d = goal.deadline.toDate ? goal.deadline.toDate() : new Date(goal.deadline);
                                            return d.toLocaleDateString();
                                        })()}
                                    </p>
                                </div>
                            </div>

                            {/* Acciones de Fondeo */}
                            {!isCompleted && (
                                <div className="border-t border-white/10 pt-4">
                                    {fundingGoalId === goal.id ? (
                                        <form onSubmit={(e) => handleFundSubmit(e, goal.id)} className="flex items-end gap-3 bg-black/20 p-3 rounded-2xl border border-white/5 animate-fade-in">
                                            <label className="flex-1 flex flex-col gap-1 text-xs font-bold text-text-muted">
                                                Cuenta Origen
                                                <select 
                                                    required
                                                    className="bg-surface border border-white/10 p-2 rounded-lg text-white outline-none"
                                                    value={fundData.accountId} onChange={e => setFundData({...fundData, accountId: e.target.value})}
                                                >
                                                    <option value="" disabled>Selecciona tarjeta de débito</option>
                                                    {debitAccounts.map(acc => (
                                                        <option key={acc.id} value={acc.id}>{acc.name} (Disp: ${acc.balance})</option>
                                                    ))}
                                                </select>
                                            </label>
                                            <label className="flex-1 max-w-[150px] flex flex-col gap-1 text-xs font-bold text-text-muted">
                                                Monto Aporte ($)
                                                <input 
                                                    required type="number" min="0.01" step="0.01"
                                                    className="bg-surface border border-white/10 p-2 rounded-lg text-white font-bold outline-none"
                                                    value={fundData.amount} onChange={e => setFundData({...fundData, amount: e.target.value})}
                                                />
                                            </label>
                                            <button 
                                                disabled={fundingLoading}
                                                type="submit" 
                                                className="bg-success text-white p-2 rounded-lg hover:bg-success/80 transition-colors h-[38px] w-[38px] flex justify-center items-center disabled:opacity-50"
                                            >
                                                <ArrowRight size={20} />
                                            </button>
                                            <button 
                                                type="button" onClick={() => setFundingGoalId(null)}
                                                className="text-text-muted hover:text-white p-2 text-xs font-bold underline h-[38px]"
                                            >
                                                Cancelar
                                            </button>
                                        </form>
                                    ) : (
                                        <button 
                                            onClick={() => setFundingGoalId(goal.id)}
                                            className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-light transition-colors"
                                        >
                                            <Plus size={16} /> Abonar a esta meta
                                        </button>
                                    )}
                                </div>
                            )}

                        </div>
                    )
                })
            )}
        </div>

      </div>
    </div>
  );
}
