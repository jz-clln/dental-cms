'use client';

import { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  placeholder?: string;
}

function generateSlots() {
  const slots = [];
  for (let h = 6; h < 24; h++) {
    for (const m of [0, 30]) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const period = h < 12 ? 'AM' : 'PM';
      const hour12 = h % 12 || 12;
      const label = `${hour12}:${String(m).padStart(2, '0')}`;
      slots.push({ value, label, period });
    }
  }
  return slots;
}

const SLOTS = generateSlots();
const AM_SLOTS = SLOTS.filter(s => s.period === 'AM');
const PM_SLOTS = SLOTS.filter(s => s.period === 'PM');

export function TimePicker({
  value, onChange, label, error, placeholder = 'Select time…',
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = SLOTS.find(s => s.value === value);

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
        <div className="flex items-center gap-2">
          <Clock className={cn('w-4 h-4 flex-shrink-0', selected ? 'text-teal-600' : 'text-gray-400')} />
          <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
            {selected ? `${selected.label} ${selected.period}` : placeholder}
          </span>
        </div>
        <ChevronDown className={cn(
          'w-4 h-4 text-gray-400 transition-transform duration-150',
          open && 'rotate-180'
        )} />
      </button>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-1 z-30 w-full bg-white rounded-xl border
          border-gray-100 shadow-lg overflow-hidden">

          {/* AM / PM headers */}
          <div className="grid grid-cols-2 border-b border-gray-100">
            <div className="py-2 text-center">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-teal-600">
                AM
              </span>
            </div>
            <div className="py-2 text-center border-l border-gray-100">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                PM
              </span>
            </div>
          </div>

          {/* Two-column grid */}
          <div className="grid grid-cols-2 max-h-52 overflow-y-auto">

            {/* AM column */}
            <div className="border-r border-gray-50">
              {AM_SLOTS.map(slot => (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => { onChange(slot.value); setOpen(false); }}
                  className={cn(
                    'w-full text-center px-2 py-2 text-sm transition-colors',
                    value === slot.value
                      ? 'bg-teal-700 text-white font-medium'
                      : 'text-gray-700 hover:bg-teal-50 hover:text-teal-700'
                  )}
                >
                  {slot.label}
                </button>
              ))}
            </div>

            {/* PM column */}
            <div>
              {PM_SLOTS.map(slot => (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => { onChange(slot.value); setOpen(false); }}
                  className={cn(
                    'w-full text-center px-2 py-2 text-sm transition-colors',
                    value === slot.value
                      ? 'bg-teal-700 text-white font-medium'
                      : 'text-gray-700 hover:bg-teal-50 hover:text-teal-700'
                  )}
                >
                  {slot.label}
                </button>
              ))}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}