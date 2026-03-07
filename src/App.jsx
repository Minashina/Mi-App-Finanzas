import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, CreditCard, PlusCircle, CalendarSync, LogOut } from 'lucide-react';
import { useFinance } from './context/FinanceContext';
import { useAuth } from './context/AuthContext';
import clsx from 'clsx';

import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import AddTransaction from './pages/AddTransaction';
import MSIDebt from './pages/MSIDebt';
import Login from './pages/Login';

const SidebarItem = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link 
      to={to} 
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
    <div className="min-h-screen flex bg-background text-text selection:bg-primary/30">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-surface/50 bg-background/50 backdrop-blur-xl flex flex-col p-4 fixed h-full z-50">
        <div className="flex items-center gap-2 mb-10 mt-2 px-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-800 shadow-[0_0_20px_rgba(139,92,246,0.5)]"></div>
          <h2 className="text-xl font-black tracking-tight">Finanzas V2</h2>
        </div>

        <nav className="flex flex-col gap-2 flex-grow">
          <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <SidebarItem to="/accounts" icon={CreditCard} label="Mis Tarjetas" />
          <SidebarItem to="/add" icon={PlusCircle} label="Registrar Gasto" />
          <SidebarItem to="/msi-debt" icon={CalendarSync} label="Deuda Futura" />
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
      <main className="flex-1 ml-64 min-h-screen pb-10">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/add" element={<AddTransaction />} />
          <Route path="/msi-debt" element={<MSIDebt />} />
        </Routes>
      </main>

    </div>
  )
}
