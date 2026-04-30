import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { calculateMSIForMonth } from '../utils/msi';
import { toJSDate } from '../utils/format';
import { startOfMonth, endOfMonth, subMonths, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, BarChart2 } from 'lucide-react';

const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtFull = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONTH_COUNT = 12;
const COLOR_A = '#8b5cf6';
const COLOR_B = '#14b8a6';

// Genera opciones de los últimos N meses en formato { value: 'YYYY-MM', label: 'Mes YYYY' }
const buildMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < MONTH_COUNT; i++) {
    const d = subMonths(now, i);
    options.push({
      value: format(d, 'yyyy-MM'),
      label: format(d, 'MMMM yyyy', { locale: es }),
    });
  }
  return options;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-white/10 rounded-xl p-3 shadow-xl text-sm">
      <p className="font-bold text-white mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="mb-1">
          {p.name}: {fmtFull(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function Trends() {
  const { transactions, fixedExpenses } = useFinance();
  const monthOptions = useMemo(buildMonthOptions, []);

  const [monthA, setMonthA] = useState(monthOptions[0].value); // mes actual
  const [monthB, setMonthB] = useState(monthOptions[1].value); // mes anterior
  const [includeFixed, setIncludeFixed] = useState(false);

  const computeExpenses = (monthStr) => {
    const target = parseISO(`${monthStr}-01`);
    const start = startOfMonth(target);
    const end = endOfMonth(target);
    const map = {};

    transactions.forEach(tx => {
      if (tx.type !== 'expense' || tx.isMSI) return;
      const d = toJSDate(tx.date);
      if (d >= start && d <= end) {
        map[tx.category] = (map[tx.category] || 0) + tx.amount;
      }
    });

    transactions.filter(tx => tx.isMSI).forEach(tx => {
      const msiAmt = calculateMSIForMonth([{ ...tx, date: toJSDate(tx.date) }], target);
      if (msiAmt > 0) {
        map[tx.category] = (map[tx.category] || 0) + msiAmt;
      }
    });

    if (includeFixed) {
      fixedExpenses.forEach(e => {
        map[e.category] = (map[e.category] || 0) + e.amount;
      });
    }

    return map;
  };

  const [mapA, mapB] = useMemo(
    () => [computeExpenses(monthA), computeExpenses(monthB)],
    [transactions, fixedExpenses, monthA, monthB, includeFixed]
  );

  const allCategories = useMemo(() => {
    const cats = new Set([...Object.keys(mapA), ...Object.keys(mapB)]);
    // Ordenar por mayor gasto combinado
    return [...cats].sort((a, b) => (mapB[b] || 0) + (mapA[b] || 0) - ((mapB[a] || 0) + (mapA[a] || 0)));
  }, [mapA, mapB]);

  const labelA = monthOptions.find(m => m.value === monthA)?.label ?? monthA;
  const labelB = monthOptions.find(m => m.value === monthB)?.label ?? monthB;

  const totalA = Object.values(mapA).reduce((s, v) => s + v, 0);
  const totalB = Object.values(mapB).reduce((s, v) => s + v, 0);
  const delta = totalA - totalB;
  const deltaPct = totalB > 0 ? ((delta / totalB) * 100).toFixed(1) : null;

  const chartDataFinal = useMemo(() =>
    allCategories.map(cat => ({
      name: cat,
      [labelA]: mapA[cat] || 0,
      [labelB]: mapB[cat] || 0,
    })),
    [allCategories, mapA, mapB, labelA, labelB]
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BarChart2 className="text-primary w-8 h-8" />
          Comparativa de Gastos
        </h1>
      </div>

      {/* Controles */}
      <div className="bg-surface rounded-2xl border border-white/5 p-5 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
          <label className="text-xs text-text-muted font-medium uppercase tracking-wider">Mes A</label>
          <select
            value={monthA}
            onChange={e => setMonthA(e.target.value)}
            className="bg-background border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-primary focus:outline-none capitalize"
          >
            {monthOptions.map(m => (
              <option key={m.value} value={m.value} className="capitalize">{m.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
          <label className="text-xs text-text-muted font-medium uppercase tracking-wider">Mes B</label>
          <select
            value={monthB}
            onChange={e => setMonthB(e.target.value)}
            className="bg-background border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-primary focus:outline-none capitalize"
          >
            {monthOptions.map(m => (
              <option key={m.value} value={m.value} className="capitalize">{m.label}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer pb-1 select-none text-sm text-text-muted hover:text-white transition-colors">
          <div
            onClick={() => setIncludeFixed(v => !v)}
            className={`w-10 h-6 rounded-full relative transition-colors ${includeFixed ? 'bg-primary' : 'bg-white/10'}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${includeFixed ? 'left-5' : 'left-1'}`} />
          </div>
          Incluir gastos fijos
        </label>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label={labelA} amount={totalA} color={COLOR_A} />
        <SummaryCard label={labelB} amount={totalB} color={COLOR_B} />
        <DeltaCard delta={delta} deltaPct={deltaPct} labelA={labelA} labelB={labelB} />
      </div>

      {/* Gráfica */}
      {chartDataFinal.length > 0 ? (
        <div className="bg-surface rounded-2xl border border-white/5 p-5 md:p-8">
          <h2 className="text-lg font-bold mb-6 capitalize">Gasto por categoría</h2>
          <ResponsiveContainer width="100%" height={Math.max(300, allCategories.length * 52)}>
            <BarChart
              data={chartDataFinal}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 8, bottom: 0 }}
              barCategoryGap="30%"
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                width={130}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '12px', paddingTop: '16px', textTransform: 'capitalize' }}
              />
              <Bar dataKey={labelA} fill={COLOR_A} radius={[0, 4, 4, 0]} maxBarSize={20} />
              <Bar dataKey={labelB} fill={COLOR_B} radius={[0, 4, 4, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-white/5 p-12 text-center text-text-muted">
          <BarChart2 size={48} className="mx-auto mb-4 opacity-20" />
          <p>No hay datos de gastos para los meses seleccionados.</p>
        </div>
      )}

      {/* Tabla de desglose */}
      {allCategories.length > 0 && (
        <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black/20 text-text-muted text-xs uppercase tracking-wider">
                <th className="px-6 py-4 text-left font-bold rounded-tl-2xl">Categoría</th>
                <th className="px-6 py-4 text-right font-bold" style={{ color: COLOR_A }}>{labelA}</th>
                <th className="px-6 py-4 text-right font-bold" style={{ color: COLOR_B }}>{labelB}</th>
                <th className="px-6 py-4 text-right font-bold rounded-tr-2xl">Diferencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {allCategories.map(cat => {
                const a = mapA[cat] || 0;
                const b = mapB[cat] || 0;
                const diff = a - b;
                return (
                  <tr key={cat} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-3.5 font-medium">{cat}</td>
                    <td className="px-6 py-3.5 text-right tabular-nums">{a > 0 ? fmtFull(a) : <span className="text-text-muted">—</span>}</td>
                    <td className="px-6 py-3.5 text-right tabular-nums">{b > 0 ? fmtFull(b) : <span className="text-text-muted">—</span>}</td>
                    <td className="px-6 py-3.5 text-right tabular-nums font-semibold">
                      <DiffBadge diff={diff} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-black/20 font-bold">
                <td className="px-6 py-4 rounded-bl-2xl">Total</td>
                <td className="px-6 py-4 text-right tabular-nums" style={{ color: COLOR_A }}>{fmtFull(totalA)}</td>
                <td className="px-6 py-4 text-right tabular-nums" style={{ color: COLOR_B }}>{fmtFull(totalB)}</td>
                <td className="px-6 py-4 text-right rounded-br-2xl"><DiffBadge diff={delta} /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, amount, color }) {
  return (
    <div className="bg-surface rounded-2xl border border-white/5 p-5">
      <p className="text-xs text-text-muted uppercase tracking-wider mb-1 capitalize">{label}</p>
      <p className="text-2xl font-black" style={{ color }}>{fmtFull(amount)}</p>
      <p className="text-xs text-text-muted mt-1">total gastado</p>
    </div>
  );
}

function DeltaCard({ delta, deltaPct, labelA, labelB }) {
  const isMore = delta > 0;
  const isEqual = delta === 0;
  const color = isEqual ? '#6b7280' : isMore ? '#f43f5e' : '#10b981';
  const Icon = isEqual ? Minus : isMore ? TrendingUp : TrendingDown;

  return (
    <div className="bg-surface rounded-2xl border border-white/5 p-5">
      <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Diferencia</p>
      <div className="flex items-center gap-2">
        <Icon size={20} style={{ color }} />
        <p className="text-2xl font-black" style={{ color }}>
          {isMore ? '+' : ''}{fmtFull(delta)}
        </p>
      </div>
      <p className="text-xs text-text-muted mt-1">
        {isEqual
          ? 'Igual en ambos meses'
          : deltaPct
            ? `${isMore ? '+' : ''}${deltaPct}% vs ${labelB}`
            : `${labelA} vs ${labelB}`}
      </p>
    </div>
  );
}

function DiffBadge({ diff }) {
  if (diff === 0) return <span className="text-text-muted">—</span>;
  const color = diff > 0 ? 'text-danger' : 'text-success';
  return (
    <span className={color}>
      {diff > 0 ? '+' : ''}{fmtFull(diff)}
    </span>
  );
}
