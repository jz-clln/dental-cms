import { TreatmentCount } from '@/types';

interface TreatmentsListProps {
  data: TreatmentCount[];
}

export function TreatmentsList({ data }: TreatmentsListProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-300">
        No treatment data available.
      </div>
    );
  }

  const max = data[0]?.count ?? 1;

  return (
    <div className="space-y-3.5">
      {data.map((item, i) => (
        <div key={item.treatment_type} className="flex items-center gap-3">

          {/* Rank dot */}
          <div className="w-5 flex-shrink-0 flex justify-center">
            <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-teal-500' : 'bg-gray-200'}`} />
          </div>

          {/* Label + bar */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm text-gray-700 truncate">{item.treatment_type}</p>
              <span className="text-[11px] text-gray-400 ml-2 flex-shrink-0 tabular-nums">
                {item.count}×
              </span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${i === 0 ? 'bg-teal-500' : 'bg-gray-300'}`}
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}