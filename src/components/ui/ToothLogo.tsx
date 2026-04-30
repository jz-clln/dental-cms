import { cn } from '@/lib/utils';

interface AppIconProps {
  size?: 'sm' | 'md' | 'lg';
  clinicName?: string;
  className?: string;
}

export function AppIcon({ size = 'md', clinicName, className }: AppIconProps) {
  const sizes = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-16 h-16 rounded-2xl',
  };

  return (
    <div
      className={cn(
        sizes[size],
        'overflow-hidden flex-shrink-0 bg-white border border-gray-100',
        className
      )}
    >
      <img
        src="/logo.png"
        alt={clinicName ?? 'Clinic logo'}
        className="w-full h-full object-cover"
      />
    </div>
  );
}