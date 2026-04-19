'use client';

import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { AppointmentStatusCount } from '@/types';

// Cohesive muted palette — no loud primaries
const STATUS_COLORS: Record<string, string> = {
  Scheduled:  '#378ADD', // blue-400
  Confirmed:  '#1D9E75', // teal-400
  Done:       '#639922', // green-400
  'No-show':  '#E24B4A', // red-400
  Cancelled:  '#888780', // gray-400
};

interface StatusPieChartProps {
  data: AppointmentStatusCount[];
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5">
      <p className="text-[11px] text-gray-400 mb-0.5">{name}</p>
      <p className="text-sm font-semibold text-gray-900">
        {value} appointment{value !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

function CustomLegend({ payload }: any) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-2">
      {(payload ?? []).map((entry: any) => (
        <div key={entry.value} className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[11px] text-gray-400">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function StatusPieChart({ data }: StatusPieChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-56 text-sm text-gray-300">
        No appointment data this month.
      </div>
    );
  }

  const chartData = data.map(d => ({ name: d.status, value: d.count }));
  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={210}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="46%"
            innerRadius={58}
            outerRadius={82}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {chartData.map((entry, i) => (
              <Cell
                key={`cell-${i}`}
                fill={STATUS_COLORS[entry.name] ?? '#888780'}
                stroke="none"
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pb-6 pointer-events-none">
        <p className="text-2xl font-semibold text-gray-900">{total}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">total</p>
      </div>
    </div>
  );
}