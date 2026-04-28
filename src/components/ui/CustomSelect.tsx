'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  error?: string;
}

export function CustomSelect({
  label, value, onChange, options, placeholder = 'Select…', error,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="flex flex-col gap-1 relative" ref={ref}>
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm',
          'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent',
          'transition-colors bg-white text-left',
          error ? 'border-red-300' :
          open ? 'border-teal-500 ring-2 ring-teal-500' :
          'border-gray-200 hover:border-gray-300',
        )}
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={cn(
          'w-4 h-4 text-gray-400 transition-transform duration-150 flex-shrink-0',
          open && 'rotate-180'
        )} />
      </button>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-1 z-30 w-full bg-white rounded-xl border
          border-gray-100 shadow-lg overflow-hidden">
          <div className="max-h-56 overflow-y-auto py-1">
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => { onChange(option.value); setOpen(false); }}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors text-left',
                  value === option.value
                    ? 'bg-teal-700 text-white font-medium'
                    : 'text-gray-700 hover:bg-teal-50 hover:text-teal-700'
                )}
              >
                {option.label}
                {value === option.value && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}