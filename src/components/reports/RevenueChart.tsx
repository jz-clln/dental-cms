'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { RevenueDataPoint } from '@/types';
import { formatPeso } from '@/lib/utils';

interface RevenueChartProps {
  data: RevenueDataPoint[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-teal-700">{formatPeso(payload[0].value)}</p>
    </div>
  );
}

export function RevenueChart({ data }: RevenueChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-56 text-gray-300 text-sm">
        No revenue data for the last 30 days.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`}
          width={42}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f0fdfa' }} />
        <Bar dataKey="revenue" fill="#0f766e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
