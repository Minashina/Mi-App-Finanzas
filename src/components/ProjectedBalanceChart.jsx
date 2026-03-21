import React from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingDown } from 'lucide-react';

export default function ProjectedBalanceChart({ data }) {
    if (!data || data.length === 0) return null;

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-surface border border-white/10 p-3 rounded-xl shadow-xl">
                    <p className="font-bold mb-2">{label}</p>
                    {payload.map(p => {
                        if (p.value === null || p.value === undefined) return null;
                        return (
                            <p key={p.dataKey} className="text-sm flex justify-between gap-4">
                                <span style={{color: p.color}}>{p.name}:</span> 
                                <span className="font-mono font-bold">${p.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </p>
                        )
                    })}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-surface p-6 rounded-3xl border border-white/5 shadow-lg flex flex-col h-full min-h-[400px]">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <TrendingDown className="text-primary" size={24}/> Proyección de Saldo
            </h2>
            <div className="flex-1 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                        <defs>
                            <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis 
                            dataKey="date" 
                            stroke="rgba(255,255,255,0.4)" 
                            fontSize={10} 
                            tickMargin={10}
                            minTickGap={20}
                        />
                        <YAxis 
                            stroke="rgba(255,255,255,0.4)" 
                            fontSize={10} 
                            tickFormatter={(val) => `$${val}`}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        
                        <Area 
                            type="monotone" 
                            dataKey="realBalance" 
                            stroke="none" 
                            fillOpacity={1} 
                            fill="url(#colorReal)" 
                            isAnimationActive={true}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="realBalance" 
                            name="Saldo Real"
                            stroke="#10b981" 
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                            isAnimationActive={true}
                        />
                        
                        <Line 
                            type="monotone" 
                            dataKey="projectedBalance" 
                            name="Proyección"
                            stroke="#8b5cf6" 
                            strokeWidth={3}
                            strokeDasharray="5 5"
                            dot={false}
                            activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                            isAnimationActive={true}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-text-muted text-center mt-4">
                La proyección futura resta tus gastos fijos pendientes y el promedio de gasto variable diario de este mes.
            </p>
        </div>
    );
}
