import React from 'react';
import { CreditCard } from 'lucide-react';
import { ACCOUNT_COLOR_CLASSES } from '../../utils/constants';

const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CreditUsageSection({ creditUsage, creditCards, onPayCard, onBreakdown }) {
  return (
    <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <CreditCard className="text-primary" /> Uso de Crédito Real
        </h2>
        <div className="flex flex-col gap-4">
            {creditUsage.map(cc => {
                const activeColorClass = ACCOUNT_COLOR_CLASSES[cc.color] || ACCOUNT_COLOR_CLASSES['default'];
                return (
                <div key={cc.id} className={`p-5 rounded-3xl border shadow-lg ${activeColorClass}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">{cc.name}</h3>
                        <span className="text-xs px-2 py-1 rounded-full bg-black/30 text-white/80">Corte: {cc.cutoffDay}</span>
                    </div>

                    <div className="mb-2 flex justify-between text-sm">
                        <span className="text-text-muted font-medium">Deuda Total Activa</span>
                        <span className="font-bold text-lg">${fmt(cc.totalDebt)}</span>
                    </div>

                    <div className="mb-4 flex flex-col md:flex-row gap-4 justify-between items-center text-sm bg-danger/10 p-4 rounded-xl border border-danger/20">
                        <div>
                            <span className="text-danger font-bold text-xs uppercase tracking-wide block mb-1">A Pagar este Corte</span>
                            <span className="font-black text-2xl text-danger">${fmt(cc.currentStatementDebt)}</span>
                        </div>
                        <div className="flex flex-col gap-2 w-full md:w-auto">
                            {cc.currentStatementDebt > 0 || cc.totalDebt > 0 ? (
                                <button
                                    onClick={() => onPayCard(cc)}
                                    className="bg-danger hover:bg-red-700 text-white font-bold py-2 px-6 rounded-xl transition-all shadow-lg hover:scale-105 w-full"
                                >
                                    Pagar Tarjeta
                                </button>
                            ) : (
                                <span className="bg-success text-white font-bold py-2 px-6 rounded-xl w-full text-center block">¡Pagada!</span>
                            )}
                            <button
                                onClick={() => onBreakdown(cc)}
                                className="text-danger hover:text-red-400 font-bold text-xs uppercase tracking-wide transition-colors text-center w-full mt-1"
                            >
                                Ver Desglose
                            </button>
                        </div>
                    </div>

                    <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden mb-2 relative">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ${cc.usagePercent > 80 ? 'bg-danger' : cc.usagePercent > 50 ? 'bg-yellow-500' : 'bg-success'}`}
                            style={{ width: `${Math.min(cc.usagePercent, 100)}%` }}
                        />
                    </div>

                    <div className="flex justify-between text-xs text-text-muted font-medium">
                        <span>Disp: <strong className="text-white">${fmt(cc.availableCredit)}</strong></span>
                        <span>Límite: ${fmt(cc.creditLimit)} ({cc.usagePercent.toFixed(1)}%)</span>
                    </div>
                </div>
                );
            })}

            {creditCards.length === 0 && (
                <div className="p-8 text-center text-text-muted bg-surface rounded-3xl border border-dashed border-white/10 text-sm">
                    No has agregado tarjetas de crédito.
                </div>
            )}
        </div>
    </div>
  );
}
