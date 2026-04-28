/**
 * DashboardCharts.tsx
 * 
 * Componentes de visualización premium utilizando Recharts.
 * Incluye AreaCharts para tendencias y BarCharts para comparativas.
 */
import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';

interface TrendData {
  date: string;
  count: number;
}

interface TrendChartProps {
  data: TrendData[];
  title: string;
  color?: string;
  loading?: boolean;
}

/**
 * TrendChart - Muestra la evolución de captación de leads.
 */
export function TrendChart({ data, title, color = '#6366f1', loading }: TrendChartProps) {
  if (loading) {
    return <div className="h-[300px] w-full bg-slate-100/50 dark:bg-slate-800/50 rounded-3xl animate-pulse" />;
  }

  return (
    <div className="w-full h-[300px] mt-6">
      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 px-2">{title}</h4>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickFormatter={(val) => val.split('-').slice(1).reverse().join('/')}
          />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(15, 23, 42, 0.9)', 
              borderRadius: '16px', 
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              color: '#fff'
            }}
            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
            labelStyle={{ color: '#6366f1', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase' }}
          />
          <Area 
            type="monotone" 
            dataKey="count" 
            stroke={color} 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorCount)" 
            animationDuration={2000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * TimeRangeSelector - Control para alternar entre 7, 15 y 30 días.
 */
export function TimeRangeSelector({ value, onChange }: { value: number, onChange: (v: number) => void }) {
  const options = [7, 15, 30];
  
  return (
    <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl glass-sm">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${
            value === opt 
              ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm' 
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          {opt}D
        </button>
      ))}
    </div>
  );
}

/**
 * FunnelStat - Un indicador visual simple de la tasa de conversión.
 */
export function FunnelStat({ value, label }: { value: number, label: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        <span className="text-xl font-black text-indigo-500">{value}%</span>
      </div>
      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
