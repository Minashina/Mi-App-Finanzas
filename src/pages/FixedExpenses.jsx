import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { addFixedExpense, deleteFixedExpense } from '../services/db';
import { CalendarClock, PlusCircle, Trash2, Home, Wifi, Zap, Droplets } from 'lucide-react';

export default function FixedExpenses() {
  const { fixedExpenses, refreshData } = useFinance();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: 'Vivienda'
  });

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
                required type="number" min="0.01" step="0.01"
                placeholder="0.00"
                className="bg-background border border-white/10 p-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-lg font-bold"
                value={formData.amount} 
                onChange={e => setFormData({...formData, amount: e.target.value})} 
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
                        {fixedExpenses.map(exp => (
                            <div key={exp.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-background rounded-2xl shadow-inner hidden sm:block">
                                        {getIcon(exp.category)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{exp.name}</h3>
                                        <p className="text-xs text-text-muted uppercase tracking-wider">{exp.category}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-black text-xl">${exp.amount.toLocaleString()}</span>
                                    <button 
                                        onClick={() => handleDelete(exp.id)} 
                                        className="p-2 text-text-muted hover:text-danger hover:bg-danger/20 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                        title="Eliminar Gasto Fijo"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}
