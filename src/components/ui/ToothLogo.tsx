import { cn } from '@/lib/utils';

interface ToothLogoProps {
  className?: string;
  size?: number;
}

export function ToothIcon({ className, size = 24 }: ToothLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 2C9.5 2 7.5 3.5 6.5 5C5.5 3.5 4 3 3 3.5C1.5 4.5 2 7 2.5 8.5C3 10 3 11 3 12C3 15 4 19 5.5 20.5C6.5 21.5 7.5 21 8 20C8.5 19 9 17 9.5 16C10 15 11 14.5 12 14.5C13 14.5 14 15 14.5 16C15 17 15.5 19 16 20C16.5 21 17.5 21.5 18.5 20.5C20 19 21 15 21 12C21 11 21 10 21.5 8.5C22 7 22.5 4.5 21 3.5C20 3 18.5 3.5 17.5 5C16.5 3.5 14.5 2 12 2Z"
        fill="currentColor"
        opacity="0.15"
        strokeWidth="0"
      />
      <path
        d="M12 2C9.5 2 7.5 3.5 6.5 5C5.5 3.5 4 3 3 3.5C1.5 4.5 2 7 2.5 8.5C3 10 3 11 3 12C3 15 4 19 5.5 20.5C6.5 21.5 7.5 21 8 20C8.5 19 9 17 9.5 16C10 15 11 14.5 12 14.5C13 14.5 14 15 14.5 16C15 17 15.5 19 16 20C16.5 21 17.5 21.5 18.5 20.5C20 19 21 15 21 12C21 11 21 10 21.5 8.5C22 7 22.5 4.5 21 3.5C20 3 18.5 3.5 17.5 5C16.5 3.5 14.5 2 12 2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Branded app icon version (white tooth on teal bg)
interface AppIconProps {
  size?: 'sm' | 'md' | 'lg';
  logoUrl?: string | null;
  clinicName?: string;
  className?: string;
}

export function AppIcon({ size = 'md', logoUrl, clinicName, className }: AppIconProps) {
  const sizes = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-16 h-16 rounded-2xl',
  };
  const iconSizes = { sm: 18, md: 22, lg: 36 };

  if (logoUrl) {
    return (
      <div className={cn(sizes[size], 'overflow-hidden flex-shrink-0 bg-white border border-gray-100', className)}>
        <img src={logoUrl} alt={clinicName ?? 'Clinic logo'} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className={cn(
      sizes[size],
      'bg-teal-700 flex items-center justify-center flex-shrink-0 shadow-sm',
      className
    )}>
      <ToothIcon size={iconSizes[size]} className="text-white" />
    </div>
  );
}
