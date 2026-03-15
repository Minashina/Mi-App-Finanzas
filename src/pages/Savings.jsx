import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { addSavingGoal, addFundsToSaving, withdrawFromSaving, deleteSavingGoal } from '../services/db';
import { differenceInWeeks, differenceInMonths, isValid, parseISO } from 'date-fns';
import { PiggyBank, Target, CalendarDays, Plus, PlusCircle, Wallet, ArrowRight, Trash2, Infinity as InfinityIcon, HelpCircle } from 'lucide-react';
import { startTour } from '../utils/tourConfig';

export default function Savings() {
  const { savings, accounts, refreshData } = useFinance();
  const [loading, setLoading] = useState(false);
  const [fundingLoading, setFundingLoading] = useState(false);
  const [isFreeGoal, setIsFreeGoal] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form para nueva meta
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    deadline: '',
    frequency: 'Mensual',
    accountId: '',
    annualYield: ''
  });

  // Estado para el mini-form de fondear meta
  const [fundingGoalId, setFundingGoalId] = useState(null);
  const [withdrawingGoalId, setWithdrawingGoalId] = useState(null);

  const [fundData, setFundData] = useState({
    accountId: '',
    amount: ''
  });

  const [withdrawData, setWithdrawData] = useState({
    accountId: '',
    amount: ''
  });

  const [displayTargetAmount, setDisplayTargetAmount] = useState('');
  const [displayFundAmount, setDisplayFundAmount] = useState('');
  const [displayWithdrawAmount, setDisplayWithdrawAmount] = useState('');

  const formatNumberInput = (e, setter, displaySetter) => {
      const rawValue = e.target.value.replace(/[^0-9.]/g, '');
      const parts = rawValue.split('.');
      if (parts.length > 2) return;
      
      setter(rawValue);

      if (rawValue === '') {
          displaySetter('');
          return;
      }

      if (parts.length === 2) {
          const formattedInt = new Intl.NumberFormat('en-US').format(parts[0] || '0');
          displaySetter(`${formattedInt}.${parts[1]}`);
      } else {
          displaySetter(new Intl.NumberFormat('en-US').format(rawValue));
      }
  };

  const debitAccounts = accounts.filter(a => a.type === 'debit' || a.type === 'cash');

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    if (!isFreeGoal && (!formData.targetAmount || !formData.deadline)) return;

    setLoading(true);
    try {
      await addSavingGoal({
        name: formData.name,
        targetAmount: isFreeGoal ? null : Number(formData.targetAmount),
        savedAmount: 0,
        deadline: isFreeGoal ? null : new Date(formData.deadline),
        frequency: isFreeGoal ? 'Libre' : formData.frequency,
        isFreeGoal: isFreeGoal,
        accountId: formData.accountId || null,
        annualYield: formData.annualYield ? Number(formData.annualYield) : 0
      });
      setFormData({ name: '', targetAmount: '', deadline: '', frequency: 'Mensual', accountId: '', annualYield: '' });
      setDisplayTargetAmount('');
      setIsFreeGoal(false);
      refreshData();
    } catch (err) {
      console.error(err);
      alert('Error al crear la meta de ahorro');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGoal = async (id, name, amount) => {
      const confirmMsg = amount > 0 
        ? `¿Estás seguro de eliminar el ahorro "${name}"? El acumulado de $${amount} NO se regresará automáticamente a ninguna tarjeta.` 
        : `¿Eliminar el ahorro "${name}"?`;
      if (!window.confirm(confirmMsg)) return;
      
      try {
          await deleteSavingGoal(id);
          refreshData();
      } catch (err) {
          console.error(err);
          alert("Error al eliminar la meta");
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
      setDisplayFundAmount('');
      refreshData();
    } catch (err) {
      console.error(err);
      alert('Error al transferir fondos al ahorro');
    } finally {
      setFundingLoading(false);
    }
  };

  const handleWithdrawSubmit = async (e, goalId) => {
    e.preventDefault();
    if (!withdrawData.accountId || !withdrawData.amount) return;
    
    // Verificar si hay fondos suficientes en el ahorro
    const saving = savings.find(s => s.id === goalId);
    if (!saving || saving.savedAmount < Number(withdrawData.amount)) {
      alert("No tienes suficientes fondos en este ahorro para realizar el retiro.");
      return;
    }

    setFundingLoading(true);
    try {
      await withdrawFromSaving(goalId, withdrawData.accountId, Number(withdrawData.amount));
      setWithdrawingGoalId(null);
      setWithdrawData({ accountId: '', amount: '' });
      setDisplayWithdrawAmount('');
      refreshData();
    } catch (err) {
      console.error(err);
      alert('Error al retirar fondos del ahorro');
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

  const calculateDailyReturn = (amount, annualYield) => {
      if (!amount || !annualYield) return 0;
      return (amount * (annualYield / 100)) / 365;
  };

  const emergencyFund = savings.find(s => s.isEmergencyFund);
  const regularSavings = savings.filter(s => !s.isEmergencyFund);

  const totalSavedAll = regularSavings.reduce((acc, s) => acc + s.savedAmount, 0);

  const handleCreateEmergencyFund = async () => {
      if (window.confirm("¿Crear tu Fondo de Emergencia? Este fondo es independiente de tus otros ahorros.")) {
          setLoading(true);
          try {
              await addSavingGoal({
                  name: 'Fondo de Emergencia',
                  targetAmount: null,
                  savedAmount: 0,
                  deadline: null,
                  frequency: 'Libre',
                  isFreeGoal: true,
                  isEmergencyFund: true,
                  accountId: null,
                  annualYield: 0
              });
              refreshData();
          } catch (err) {
              console.error(err);
              alert("Error al crear el Fondo de Emergencia");
          } finally {
              setLoading(false);
          }
      }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <PiggyBank className="text-primary w-8 h-8" />
              Ahorros e Inversiones
            </h1>
            <button 
                onClick={() => startTour('savings')} 
                className="bg-white/5 hover:bg-primary/20 text-text-muted hover:text-primary transition-all p-2 rounded-full border border-white/10"
                title="Ayuda sobre esta pantalla"
            >
                <HelpCircle size={20} />
            </button>
          </div>
          <div className="bg-surface border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-lg w-full md:w-auto">
             <div className="flex-1">
                <p className="text-xs text-text-muted uppercase tracking-wider font-bold mb-1">Total Ahorrado</p>
                <p className="text-2xl md:text-3xl font-black text-white">${totalSavedAll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
             </div>
             <div className="bg-primary/20 p-3 rounded-xl">
                 <Target className="text-primary-light" size={24} />
             </div>
          </div>
      </div>

      <div className="flex flex-col gap-8">
        
        {/* Toggle Formulario para Crear Meta */}
        <div id="tour-sav-form" className="bg-surface p-6 rounded-3xl border border-white/5 shadow-xl transition-all">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowCreateForm(!showCreateForm)}>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <PlusCircle className={`text-primary transition-transform ${showCreateForm ? 'rotate-45 text-danger' : ''}`} /> 
                {showCreateForm ? 'Cancelar Creación' : 'Crear Nueva Cuenta de Ahorro o Meta'}
              </h2>
              <button className="text-primary font-bold text-sm bg-primary/10 px-4 py-2 rounded-lg">
                  {showCreateForm ? 'Ocultar' : 'Crear'}
              </button>
          </div>
          
          {showCreateForm && (
          <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4 mt-6 pt-6 border-t border-white/10 animate-fade-in">
            
            <label className="flex flex-col gap-2 font-medium text-sm">
              Nombre de la Meta / Fondo
              <input 
                required type="text" placeholder="Ej. Viaje a Japón, Auto nuevo..."
                className="bg-background border border-white/10 p-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
              />
            </label>

            <label id="tour-sav-free" className="flex items-center gap-2 font-medium text-sm cursor-pointer select-none bg-black/20 p-3 rounded-xl border border-white/5 hover:bg-black/40 xl:whitespace-nowrap">
              <input 
                type="checkbox" 
                className="accent-primary w-4 h-4 cursor-pointer"
                checked={isFreeGoal} 
                onChange={e => setIsFreeGoal(e.target.checked)} 
              />
              Ahorro Libre (Sin objetivo ni fecha límite)
            </label>

            <label className="flex flex-col gap-2 font-medium text-sm">
              Cuenta de Ahorro
              <select 
                className="bg-background border border-white/10 p-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})}
              >
                  <option value="">Ninguna / Efectivo</option>
                  {debitAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 font-medium text-sm">
              Rendimiento Anual (%)
              <input 
                type="number" min="0" step="0.01" placeholder="Ej. 15 para 15%"
                className="bg-background border border-white/10 p-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                value={formData.annualYield} onChange={e => setFormData({...formData, annualYield: e.target.value})} 
              />
            </label>

            {!isFreeGoal && (
               <>
                <label className="flex flex-col gap-2 font-medium text-sm">
                  Monto Objetivo ($)
                  <input 
                    required type="text" inputMode="decimal" placeholder="Ej. 50,000"
                    className="bg-background border border-white/10 p-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-lg font-bold"
                    value={displayTargetAmount} onChange={e => formatNumberInput(e, (val) => setFormData({...formData, targetAmount: val}), setDisplayTargetAmount)} 
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
                  <p className="text-[10px] text-text-muted leading-tight mb-1">Te sugeriremos cuánto apartar basado en tu frecuencia y fecha.</p>
                  <select 
                    className="bg-background border border-white/10 p-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    value={formData.frequency} onChange={e => setFormData({...formData, frequency: e.target.value})}
                  >
                    <option value="Semanal">Semanal</option>
                    <option value="Quincenal">Quincenal</option>
                    <option value="Mensual">Mensual</option>
                  </select>
                </label>
               </>
            )}

            <button 
              disabled={loading}
              className="mt-4 w-full bg-primary text-white py-3 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Guardar Cuenta / Meta'}
            </button>
          </form>
          )}
        </div>

        {/* Fondo de Emergencia Top Level Card */}
        <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border border-blue-500/30 rounded-3xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-blue-100">
                        <Wallet className="text-blue-400" /> Colchón Financiero / Fondo de Emergencia
                    </h2>
                    <p className="text-sm text-blue-200/70 mt-1 max-w-xl">
                        Este fondo es 100% independiente de tus metas de ahorro. Se recomienda tener al menos 3 meses de sueldo disponibles para cualquier imprevisto.
                    </p>
                </div>
                {!emergencyFund && (
                    <button 
                        onClick={handleCreateEmergencyFund}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 whitespace-nowrap"
                    >
                        <PlusCircle size={20} /> Crear Fondo
                    </button>
                )}
            </div>

            {emergencyFund && (
                <div className="bg-black/20 rounded-2xl p-6 border border-white/5">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
                        <div>
                            <p className="text-xs text-blue-300 uppercase tracking-wider font-bold mb-1">Total Ahorrado para Emergencias</p>
                            <p className="text-4xl font-black text-white">
                                ${emergencyFund.savedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => {
                                    setFundingGoalId(emergencyFund.id);
                                    setWithdrawingGoalId(null);
                                }}
                                className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 px-4 py-2 rounded-lg font-bold transition-all text-sm flex items-center gap-2 border border-blue-500/20"
                            >
                                <Plus size={16} /> Abonar
                            </button>
                            {emergencyFund.savedAmount > 0 && (
                                <button 
                                    onClick={() => {
                                        setWithdrawingGoalId(emergencyFund.id);
                                        setFundingGoalId(null);
                                    }}
                                    className="bg-surface/50 hover:bg-white/10 text-white px-4 py-2 rounded-lg font-bold transition-all text-sm flex items-center gap-2 border border-white/10"
                                >
                                    <ArrowRight size={16} /> Disponer
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Acciones de Fondeo y Retiro para Fondo de Emergencia */}
                    <div className="mt-4">
                        {fundingGoalId === emergencyFund.id && (
                            <form onSubmit={(e) => handleFundSubmit(e, emergencyFund.id)} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 bg-black/40 p-4 rounded-xl border border-blue-500/20 animate-fade-in">
                                <div className="flex-1 space-y-3 sm:space-y-0 sm:flex sm:gap-3">
                                    <label className="flex-1 flex flex-col gap-1 text-xs font-bold text-blue-200">
                                        Transferir desde:
                                        <select 
                                            required
                                            className="bg-surface border border-white/10 p-3 rounded-xl text-white outline-none w-full"
                                            value={fundData.accountId} onChange={e => setFundData({...fundData, accountId: e.target.value})}
                                        >
                                            <option value="" disabled>Selecciona tarjeta de débito...</option>
                                            {debitAccounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name} (Disp: ${acc.balance})</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="sm:max-w-[150px] flex flex-col gap-1 text-xs font-bold text-blue-200">
                                        Monto ($)
                                        <input 
                                            required type="text" inputMode="decimal" placeholder="0.00"
                                            className="bg-surface border border-white/10 p-3 rounded-xl text-white font-bold outline-none w-full"
                                            value={displayFundAmount} onChange={e => formatNumberInput(e, (val) => setFundData({...fundData, amount: val}), setDisplayFundAmount)}
                                        />
                                    </label>
                                </div>
                                <div className="flex gap-2 mt-2 sm:mt-0">
                                    <button type="button" onClick={() => setFundingGoalId(null)} className="flex-1 sm:flex-none text-text-muted bg-surface/50 border border-white/5 hover:bg-white/10 p-3 rounded-xl text-sm font-bold transition-colors">Cancelar</button>
                                    <button disabled={fundingLoading} type="submit" className="flex-1 sm:flex-none bg-blue-600 text-white p-3 px-6 rounded-xl hover:bg-blue-500 transition-colors font-bold flex justify-center items-center gap-2 disabled:opacity-50">
                                        <PlusCircle size={18} /> Abonar
                                    </button>
                                </div>
                            </form>
                        )}
                        {withdrawingGoalId === emergencyFund.id && (
                            <form onSubmit={(e) => handleWithdrawSubmit(e, emergencyFund.id)} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 bg-black/40 p-4 rounded-xl border border-blue-500/20 animate-fade-in">
                                <div className="flex-1 space-y-3 sm:space-y-0 sm:flex sm:gap-3">
                                    <label className="flex-1 flex flex-col gap-1 text-xs font-bold text-blue-200">
                                        Retirar hacia:
                                        <select 
                                            required
                                            className="bg-surface border border-white/10 p-3 rounded-xl text-white outline-none w-full"
                                            value={withdrawData.accountId} onChange={e => setWithdrawData({...withdrawData, accountId: e.target.value})}
                                        >
                                            <option value="" disabled>Selecciona tarjeta de destino...</option>
                                            {debitAccounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name} (Disp: ${acc.balance})</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="sm:max-w-[150px] flex flex-col gap-1 text-xs font-bold text-blue-200">
                                        Monto a Retirar ($)
                                        <input 
                                            required type="text" inputMode="decimal" placeholder="0.00"
                                            className="bg-surface border border-white/10 p-3 rounded-xl text-white font-bold outline-none w-full"
                                            value={displayWithdrawAmount} onChange={e => formatNumberInput(e, (val) => setWithdrawData({...withdrawData, amount: val}), setDisplayWithdrawAmount)}
                                        />
                                    </label>
                                </div>
                                <div className="flex gap-2 mt-2 sm:mt-0">
                                    <button type="button" onClick={() => setWithdrawingGoalId(null)} className="flex-1 sm:flex-none text-text-muted bg-surface/50 border border-white/5 hover:bg-white/10 p-3 rounded-xl text-sm font-bold transition-colors">Cancelar</button>
                                    <button disabled={fundingLoading} type="submit" className="flex-1 sm:flex-none bg-white text-blue-900 p-3 px-6 rounded-xl hover:bg-gray-200 transition-colors font-bold flex justify-center items-center gap-2 disabled:opacity-50">
                                        <ArrowRight size={18} /> Retirar
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Listado de Metas */}
        <div id="tour-sav-list" className="space-y-6">
            
            <h2 className="text-2xl font-bold flex items-center gap-3">
                <Target className="text-primary" /> Mis Metas de Ahorro
            </h2>

            {regularSavings.length === 0 ? (
                <div className="bg-surface rounded-3xl border border-white/5 shadow-xl p-10 text-center text-text-muted">
                    <Target size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No tienes metas de ahorro activas.</p>
                    <p className="text-sm">Empieza a planear tu futuro creando una meta hoy.</p>
                </div>
            ) : (
                regularSavings.map(goal => {
                    const isFree = goal.isFreeGoal;
                    const quota = isFree ? 0 : calculateQuota(goal.targetAmount, goal.savedAmount, goal.deadline, goal.frequency);
                    const progress = isFree ? 0 : Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
                    const isCompleted = !isFree && progress >= 100;
                    
                    return (
                        <div key={goal.id} className="bg-surface rounded-3xl border border-white/5 shadow-xl overflow-hidden p-6 transition-all hover:border-white/10">
                            
                            {/* Cabecera Meta */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 gap-4">
                                <div>
                                    <h3 className="text-2xl font-bold mb-1 flex items-center flex-wrap gap-2">
                                        {goal.name} 
                                        {isCompleted && <span className="text-xs bg-success/20 text-success px-2 py-1 rounded-full uppercase tracking-widest">¡Logrado!</span>}
                                        {isFree && <span className="text-[10px] bg-primary/20 text-primary-light px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1"><InfinityIcon size={12}/> Libre</span>}
                                    </h3>
                                    {!isFree && <p className="text-text-muted text-sm font-medium">Meta: ${goal.targetAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>}
                                </div>
                                <div className="text-left w-full md:w-auto md:text-right flex flex-col items-start md:items-end">
                                    <div className="flex items-center justify-between w-full md:justify-end gap-4 mb-1">
                                        <p className="text-xs text-text-muted uppercase tracking-wider font-bold">Acumulado</p>
                                        <button onClick={() => handleDeleteGoal(goal.id, goal.name, goal.savedAmount)} className="text-text-muted hover:text-danger transition-colors p-1 -mr-1" title="Eliminar"><Trash2 size={16}/></button>
                                    </div>
                                    <p className={`text-3xl font-black ${isCompleted ? 'text-success' : 'text-primary-light'}`}>
                                        ${goal.savedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    {goal.annualYield > 0 && goal.savedAmount > 0 && (
                                        <p className="text-xs text-success font-bold mt-1">
                                            +${calculateDailyReturn(goal.savedAmount, goal.annualYield).toFixed(2)} al día ({goal.annualYield}% anual)
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Barra Progreso */}
                            {!isFree && (
                                <>
                                    <div className="w-full bg-black/40 rounded-full h-4 overflow-hidden mb-6 relative">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-success' : 'bg-primary'}`}
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                        <div className="bg-background rounded-xl p-3 border border-white/5">
                                            <p className="text-[10px] text-text-muted uppercase font-bold mb-1">Sugerencia</p>
                                            <p className="font-bold text-sm">{isCompleted ? '-' : `$${quota.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})} / ${goal.frequency?.toLowerCase()}`}</p>
                                        </div>
                                        <div className="bg-background rounded-xl p-3 border border-white/5">
                                            <p className="text-[10px] text-text-muted uppercase font-bold mb-1">Fecha Límite</p>
                                            <p className="font-bold text-sm flex items-center xl:whitespace-nowrap gap-1">
                                                <CalendarDays size={14}/> 
                                                {(() => {
                                                    if(!goal.deadline) return '-';
                                                    const d = goal.deadline.toDate ? goal.deadline.toDate() : new Date(goal.deadline);
                                                    return d.toLocaleDateString();
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Acciones de Fondeo y Retiro */}
                            <div className="border-t border-white/10 pt-4 mt-2">
                                {fundingGoalId === goal.id ? (
                                    <form onSubmit={(e) => handleFundSubmit(e, goal.id)} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 bg-black/20 p-4 rounded-2xl border border-white/5 animate-fade-in">
                                        <div className="flex-1 space-y-3 sm:space-y-0 sm:flex sm:gap-3">
                                            <label className="flex-1 flex flex-col gap-1 text-xs font-bold text-text-muted">
                                                Transferir desde:
                                                <select 
                                                    required
                                                    className="bg-surface border border-white/10 p-3 rounded-xl text-white outline-none w-full"
                                                    value={fundData.accountId} onChange={e => setFundData({...fundData, accountId: e.target.value})}
                                                >
                                                    <option value="" disabled>Selecciona tarjeta de débito</option>
                                                    {debitAccounts.map(acc => (
                                                        <option key={acc.id} value={acc.id}>{acc.name} (Disp: ${acc.balance})</option>
                                                    ))}
                                                </select>
                                            </label>
                                            <label className="sm:max-w-[150px] flex flex-col gap-1 text-xs font-bold text-text-muted">
                                                Monto ($)
                                                <input 
                                                    required type="text" inputMode="decimal" placeholder="0.00"
                                                    className="bg-surface border border-white/10 p-3 rounded-xl text-white font-bold outline-none w-full"
                                                    value={displayFundAmount} onChange={e => formatNumberInput(e, (val) => setFundData({...fundData, amount: val}), setDisplayFundAmount)}
                                                />
                                            </label>
                                        </div>
                                        
                                        <div className="flex gap-2 mt-2 sm:mt-0">
                                            <button 
                                                type="button" onClick={() => setFundingGoalId(null)}
                                                className="flex-1 sm:flex-none text-text-muted bg-surface/50 border border-white/5 hover:bg-white/10 p-3 rounded-xl text-sm font-bold transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button 
                                                disabled={fundingLoading}
                                                type="submit" 
                                                className="flex-1 sm:flex-none bg-success text-white p-3 px-6 rounded-xl hover:bg-success/80 transition-colors font-bold flex justify-center items-center gap-2 disabled:opacity-50"
                                            >
                                                <PlusCircle size={18} /> Abonar
                                            </button>
                                        </div>
                                    </form>
                                ) : withdrawingGoalId === goal.id ? (
                                    <form onSubmit={(e) => handleWithdrawSubmit(e, goal.id)} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 bg-black/20 p-4 rounded-2xl border border-white/5 animate-fade-in">
                                        <div className="flex-1 space-y-3 sm:space-y-0 sm:flex sm:gap-3">
                                            <label className="flex-1 flex flex-col gap-1 text-xs font-bold text-text-muted">
                                                Retirar hacia:
                                                <select 
                                                    required
                                                    className="bg-surface border border-white/10 p-3 rounded-xl text-white outline-none w-full"
                                                    value={withdrawData.accountId} onChange={e => setWithdrawData({...withdrawData, accountId: e.target.value})}
                                                >
                                                    <option value="" disabled>Selecciona tarjeta de destino</option>
                                                    {debitAccounts.map(acc => (
                                                        <option key={acc.id} value={acc.id}>{acc.name} (Disp: ${acc.balance})</option>
                                                    ))}
                                                </select>
                                            </label>
                                            <label className="sm:max-w-[150px] flex flex-col gap-1 text-xs font-bold text-text-muted">
                                                Monto a Retirar ($)
                                                <input 
                                                    required type="text" inputMode="decimal" placeholder="0.00"
                                                    className="bg-surface border border-white/10 p-3 rounded-xl text-white font-bold outline-none w-full"
                                                    value={displayWithdrawAmount} onChange={e => formatNumberInput(e, (val) => setWithdrawData({...withdrawData, amount: val}), setDisplayWithdrawAmount)}
                                                />
                                            </label>
                                        </div>
                                        
                                        <div className="flex gap-2 mt-2 sm:mt-0">
                                            <button 
                                                type="button" onClick={() => setWithdrawingGoalId(null)}
                                                className="flex-1 sm:flex-none text-text-muted bg-surface/50 border border-white/5 hover:bg-white/10 p-3 rounded-xl text-sm font-bold transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button 
                                                disabled={fundingLoading}
                                                type="submit" 
                                                className="flex-1 sm:flex-none bg-primary text-white p-3 px-6 rounded-xl hover:bg-primary/80 transition-colors font-bold flex justify-center items-center gap-2 disabled:opacity-50"
                                            >
                                                <ArrowRight size={18} /> Retirar
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="flex flex-wrap gap-4">
                                        {!isCompleted && (
                                        <button 
                                            onClick={() => {
                                                setFundingGoalId(goal.id);
                                                setWithdrawingGoalId(null);
                                            }}
                                            className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-light transition-colors"
                                        >
                                            <Plus size={16} /> Abonar a esta meta
                                        </button>
                                        )}
                                        {goal.savedAmount > 0 && (
                                        <button 
                                            onClick={() => {
                                                setWithdrawingGoalId(goal.id);
                                                setFundingGoalId(null);
                                            }}
                                            className="flex items-center gap-2 text-sm font-bold text-text-muted hover:text-white transition-colors"
                                        >
                                            <ArrowRight size={16} /> Disponer (Retirar)
                                        </button>
                                        )}
                                    </div>
                                )}
                            </div>

                        </div>
                    )
                })
            )}
        </div>

      </div>
    </div>
  );
}
