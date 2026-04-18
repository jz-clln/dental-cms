import { cn, STATUS_COLORS } from '@/lib/utils';

interface BadgeProps {
  label: string;
  className?: string;
}

export function Badge({ label, className }: BadgeProps) {
  const colorClass = STATUS_COLORS[label] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}
