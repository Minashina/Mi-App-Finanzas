import React from 'react';
import { AlertTriangle, TrendingUp, CheckCircle, Activity } from 'lucide-react';

export default function BurnRateIndicator({ burnRateData }) {
    if (!burnRateData) return null;
    
    const { status, actualDailySpend, safeDailySpend } = burnRateData;

    let bgClass = '';
    let icon = null;
    let title = '';
    let message = '';
    let textColor = '';

    if (status === 'red') {
        bgClass = 'bg-red-900/20 border-red-500/30';
        icon = <AlertTriangle className="text-red-500" size={32} />;
        title = 'Ritmo Peligroso';
        message = 'Estás gastando más rápido de lo que tu saldo permite.';
        textColor = 'text-red-500';
    } else if (status === 'yellow') {
        bgClass = 'bg-yellow-900/20 border-yellow-500/30';
        icon = <TrendingUp className="text-yellow-500" size={32} />;
        title = 'Alerta de Consumo';
        message = 'Tu ritmo de gasto está muy cerca del límite de tu saldo restante.';
        textColor = 'text-yellow-500';
    } else {
        bgClass = 'bg-green-900/20 border-green-500/30';
        icon = <CheckCircle className="text-green-500" size={32} />;
        title = 'Ritmo Saludable';
        message = 'Tus gastos diarios están dentro de un rango seguro para terminar el mes.';
        textColor = 'text-green-500';
    }

    return (
        <div className={`p-6 rounded-3xl border shadow-lg flex flex-col md:flex-row gap-4 items-center ${bgClass} transition-all`}>
            <div className="p-4 bg-background rounded-full shadow-inner">
                {icon}
            </div>
            <div className="flex-1 text-center md:text-left">
                <p className="text-xs uppercase tracking-widest font-bold opacity-70 flex items-center justify-center md:justify-start gap-1">
                    <Activity size={14} /> Tu Ritmo de Gasto
                </p>
                <h3 className={`text-xl font-black mt-1 ${textColor}`}>{title}</h3>
                <p className="text-sm opacity-80 mt-1">{message}</p>
            </div>
            <div className="flex gap-4 md:flex-col md:gap-2 text-sm mt-4 md:mt-0 bg-black/20 p-4 rounded-2xl w-full md:w-auto justify-center md:min-w-[180px]">
                 <div className="flex flex-col text-center md:text-right">
                     <span className="text-xs opacity-60">Gasto Prom. Diario</span>
                     <span className="font-bold">${actualDailySpend.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                 </div>
                 <div className="hidden md:block w-full h-[1px] bg-white/10"></div>
                 <div className="flex flex-col text-center md:text-right">
                     <span className="text-xs opacity-60">Límite Diario Rec.</span>
                     <span className="font-bold">${safeDailySpend.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                 </div>
            </div>
        </div>
    );
}
