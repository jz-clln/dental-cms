import { TreatmentCount } from '@/types';
import { Stethoscope } from 'lucide-react';

interface TreatmentsListProps {
  data: TreatmentCount[];
}

export function TreatmentsList({ data }: TreatmentsListProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-300 text-sm">
        No treatment data available.
      </div>
    );
  }

  const max = data[0]?.count ?? 1;

  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={item.treatment_type} className="flex items-center gap-3">
          {/* Rank */}
          <div className="w-6 text-center flex-shrink-0">
            <span className={`text-xs font-bold ${i === 0 ? 'text-teal-700' : 'text-gray-400'}`}>
              #{i + 1}
            </span>
          </div>

          {/* Label + bar */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-gray-800 truncate">{item.treatment_type}</p>
              <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                {item.count} appt{item.count !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-600 rounded-full transition-all duration-500"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
