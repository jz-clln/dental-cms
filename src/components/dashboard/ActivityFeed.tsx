import { ActivityItem } from '@/types';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { getRelativeTime } from '@/lib/utils';
import { Calendar, Users, Receipt, Package, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS = {
  appointment: { icon: Calendar, bg: 'bg-blue-100', color: 'text-blue-600' },
  patient:     { icon: Users,    bg: 'bg-teal-100', color: 'text-teal-600' },
  payment:     { icon: Receipt,  bg: 'bg-green-100', color: 'text-green-600' },
  inventory:   { icon: Package,  bg: 'bg-amber-100', color: 'text-amber-600' },
};

interface ActivityFeedProps {
  items: ActivityItem[];
  loading?: boolean;
}

export function ActivityFeed({ items, loading }: ActivityFeedProps) {
  if (loading) return <SkeletonTable rows={4} />;

  if (items.length === 0) {
    return (
      <div className="text-center py-10">
        <Activity className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map(item => {
        const config = ICONS[item.type];
        const Icon = config.icon;
        return (
          <div key={item.id} className="flex items-center gap-3 py-3 px-1">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', config.bg)}>
              <Icon className={cn('w-4 h-4', config.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 truncate">{item.description}</p>
            </div>
            <p className="text-xs text-gray-400 flex-shrink-0">{getRelativeTime(item.timestamp)}</p>
          </div>
        );
      })}
    </div>
  );
}
