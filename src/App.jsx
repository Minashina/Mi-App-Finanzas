import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, CreditCard, PlusCircle, CalendarSync, LogOut, Menu, X } from 'lucide-react';
import { useFinance } from './context/FinanceContext';
import { useAuth } from './context/AuthContext';
import clsx from 'clsx';

import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import AddTransaction from './pages/AddTransaction';
import MSIDebt from './pages/MSIDebt';
import Login from './pages/Login';
import History from './pages/History';
import FixedExpenses from './pages/FixedExpenses';
import Savings from './pages/Savings';
import Statement from './pages/Statement';
import { List, CalendarClock as ClockIcon, PiggyBank, FileText } from 'lucide-react'; // Iconos extra

const SidebarItem = ({ to, icon: Icon, label, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={clsx(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
        isActive 
          ? "bg-primary/20 text-primary font-semibold shadow-[0_0_15px_rgba(139,92,246,0.3)]"
          : "text-text-muted hover:bg-surface hover:text-text"
      )}
    >
      <Icon size={20} className={isActive ? "text-primary" : ""} />
      <span>{label}</span>
    </Link>
  );
};

export default function App() {
  const { currentUser, logout } = useAuth();
  const { loading, error, refreshData } = useFinance();
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Recargar datos cada que el usuario cambia
  useEffect(() => {
    if (currentUser) {
      refreshData();
      setDataLoaded(true);
    } else {
        setDataLoaded(false);
    }
  }, [currentUser]);

  if (!currentUser) {
    return <Login />;
  }

  if (loading && !dataLoaded) {
    return (
      <div className="min-h-screen bg-background text-text flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-danger flex flex-col items-center justify-center gap-4">
        <p className="text-xl font-bold">{error}</p>
        <p className="text-sm text-text-muted">Revisa la configuración de Firebase en src/lib/firebase.js</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-text selection:bg-primary/30 relative">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-background/90 backdrop-blur-xl border-b border-surface/50 fixed top-0 w-full z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-800 shadow-[0_0_20px_rgba(139,92,246,0.5)]"></div>
          <h2 className="text-xl font-black tracking-tight">Finanzas V5</h2>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 bg-surface rounded-xl border border-white/5 text-text hover:text-primary transition-colors"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside id="tour-sidebar" className={clsx(
        "w-64 border-r border-surface/50 bg-background/95 backdrop-blur-xl flex flex-col p-4 fixed h-full z-50 transition-transform duration-300 md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between gap-2 mb-10 mt-2 px-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-800 shadow-[0_0_20px_rgba(139,92,246,0.5)]"></div>
            <h2 className="text-xl font-black tracking-tight">Finanzas V5</h2>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-2 bg-surface rounded-xl border border-white/5 text-text-muted hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-2 flex-grow overflow-y-auto pr-2 custom-scrollbar">
          <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" onClick={() => setIsSidebarOpen(false)} />
          <SidebarItem to="/accounts" icon={CreditCard} label="Mis Tarjetas" onClick={() => setIsSidebarOpen(false)} />
          <SidebarItem to="/add" icon={PlusCircle} label="Registrar Gasto" onClick={() => setIsSidebarOpen(false)} />
          <SidebarItem to="/fixed-expenses" icon={ClockIcon} label="Gastos Fijos" onClick={() => setIsSidebarOpen(false)} />
          <SidebarItem to="/savings" icon={PiggyBank} label="Ahorros" onClick={() => setIsSidebarOpen(false)} />
          <SidebarItem to="/history" icon={List} label="Historial" onClick={() => setIsSidebarOpen(false)} />
          <SidebarItem to="/msi-debt" icon={CalendarSync} label="Deuda Futura" onClick={() => setIsSidebarOpen(false)} />
          <SidebarItem to="/statement" icon={FileText} label="Estado de Cuenta" onClick={() => setIsSidebarOpen(false)} />
        </nav>
        
        {/* User Info & Logout */}
        <div className="mt-auto border-t border-white/10 pt-4 flex flex-col gap-3">
            <div className="text-xs text-text-muted px-2 truncate" title={currentUser.email}>
                {currentUser.email}
            </div>
            <button 
                onClick={logout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-danger hover:bg-danger/10 w-full"
            >
                <LogOut size={20} />
                <span>Cerrar Sesión</span>
            </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 min-h-screen pt-20 md:pt-0 pb-10 w-full overflow-x-hidden relative">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/add" element={<AddTransaction />} />
          <Route path="/fixed-expenses" element={<FixedExpenses />} />
          <Route path="/savings" element={<Savings />} />
          <Route path="/history" element={<History />} />
          <Route path="/msi-debt" element={<MSIDebt />} />
          <Route path="/statement" element={<Statement />} />
        </Routes>
        
        {/* Floating Action Button for Mobile */}
        <Link
            id="tour-fab"
            to="/add"
            className="md:hidden fixed bottom-6 right-6 z-50 bg-gradient-to-r from-primary to-purple-600 text-white p-4 rounded-full shadow-[0_0_20px_rgba(139,92,246,0.6)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
        >
            <PlusCircle size={28} />
        </Link>
      </main>

    </div>
  )
}
