'use client';

import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { AppointmentStatusCount } from '@/types';

const STATUS_CHART_COLORS: Record<string, string> = {
  Scheduled:  '#3b82f6',
  Confirmed:  '#0f766e',
  Done:       '#22c55e',
  'No-show':  '#ef4444',
  Cancelled:  '#94a3b8',
};

interface StatusPieChartProps {
  data: AppointmentStatusCount[];
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-3">
      <p className="text-xs text-gray-400 mb-1">{name}</p>
      <p className="text-sm font-bold text-gray-900">{value} appointment{value !== 1 ? 's' : ''}</p>
    </div>
  );
}

function CustomLegend({ payload }: any) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-3">
      {(payload ?? []).map((entry: any) => (
        <div key={entry.value} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-gray-500">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function StatusPieChart({ data }: StatusPieChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-56 text-gray-300 text-sm">
        No appointment data this month.
      </div>
    );
  }

  const chartData = data.map(d => ({
    name: d.status,
    value: d.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={STATUS_CHART_COLORS[entry.name] ?? '#94a3b8'}
              stroke="none"
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
