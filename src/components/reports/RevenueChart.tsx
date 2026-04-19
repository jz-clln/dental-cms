'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { RevenueDataPoint } from '@/types';
import { formatPeso } from '@/lib/utils';

interface RevenueChartProps {
  data: RevenueDataPoint[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5">
      <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-teal-700">{formatPeso(payload[0].value)}</p>
    </div>
  );
}

function formatYAxis(v: number) {
  if (v === 0) return '₱0';
  if (v >= 1000) return `₱${(v / 1000).toFixed(0)}k`;
  return `₱${v}`;
}

export function RevenueChart({ data }: RevenueChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-56 text-sm text-gray-300">
        No revenue data for the last 30 days.
      </div>
    );
  }

  const max = Math.max(...data.map(d => d.revenue));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        barCategoryGap="35%"
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#f1f5f9"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatYAxis}
          width={44}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: '#f8fafc' }}
        />
        <Bar dataKey="revenue" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={`cell-${i}`}
              fill={entry.revenue === max && max > 0 ? '#0f766e' : '#99e6d0'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}