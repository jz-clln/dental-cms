import React, { InputHTMLAttributes, forwardRef, useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

/* ─── INPUT ─────────────────────────────────────────────────── */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 rounded-xl border text-[13px] text-gray-800 placeholder:text-gray-300',
            'focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400',
            'transition-colors bg-white',
            error
              ? 'border-red-300 focus:ring-red-400/30 focus:border-red-400'
              : 'border-gray-200 hover:border-gray-300',
            className
          )}
          {...props}
        />
        {error && <p className="text-[11px] text-red-500">{error}</p>}
        {hint && !error && <p className="text-[11px] text-gray-400">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

/* ─── TEXTAREA ──────────────────────────────────────────────── */

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 rounded-xl border text-[13px] text-gray-800 placeholder:text-gray-300',
            'focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400',
            'transition-colors bg-white resize-none',
            error
              ? 'border-red-300 focus:ring-red-400/30 focus:border-red-400'
              : 'border-gray-200 hover:border-gray-300',
            className
          )}
          {...props}
        />
        {error && <p className="text-[11px] text-red-500">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

/* ─── SELECT (custom dropdown — no native browser UI) ───────── */

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  placeholder?: string;
  children?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, children, placeholder, value, onChange, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse <option> children into { label, value } pairs
    const options: { label: string; value: string }[] = [];
    if (placeholder) options.push({ label: placeholder, value: '' });

    const parseChildren = (nodes: React.ReactNode) => {
      React.Children.forEach(nodes, child => {
        if (!child || typeof child !== 'object') return;
        const el = child as React.ReactElement<{ value?: string; children?: React.ReactNode }>;
        if (el.type === 'option') {
          options.push({
            label: String(el.props.children ?? el.props.value ?? ''),
            value: String(el.props.value ?? ''),
          });
        } else if (el.props?.children) {
          parseChildren(el.props.children);
        }
      });
    };
    parseChildren(children);

    const selectedLabel = options.find(o => String(o.value) === String(value ?? ''))?.label
      ?? placeholder
      ?? 'Select…';

    // Close on outside click
    useEffect(() => {
      function handleOutside(e: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      }
      document.addEventListener('mousedown', handleOutside);
      return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    function handleSelect(optValue: string) {
      // Fire a synthetic onChange so existing form logic works unchanged
      if (onChange) {
        const syntheticEvent = {
          target: { value: optValue },
          currentTarget: { value: optValue },
        } as React.ChangeEvent<HTMLSelectElement>;
        onChange(syntheticEvent);
      }
      setOpen(false);
    }

    const isPlaceholder = !value || value === '';

    return (
      <div ref={containerRef} className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            {label}
          </label>
        )}

        {/* Trigger button */}
        <button
          type="button"
          id={inputId}
          onClick={() => setOpen(v => !v)}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-xl border bg-white',
            'text-[13px] transition-colors focus:outline-none focus:ring-2',
            open
              ? 'ring-2 ring-teal-500/30 border-teal-400'
              : error
                ? 'border-red-300 focus:ring-red-400/30'
                : 'border-gray-200 hover:border-gray-300 focus:ring-teal-500/30 focus:border-teal-400',
            className
          )}
        >
          <span className={cn(isPlaceholder ? 'text-gray-300' : 'text-gray-800')}>
            {selectedLabel}
          </span>
          <ChevronDown className={cn(
            'w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0',
            open && 'rotate-180'
          )} />
        </button>

        {/* Dropdown panel */}
        {open && (
          <div className="absolute z-50 mt-1 bg-white rounded-xl border border-gray-200
            shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden"
            style={{ width: containerRef.current?.offsetWidth }}
          >
            <div className="max-h-52 overflow-y-auto py-1">
              {options.map((opt, i) => {
                const isSelected = String(opt.value) === String(value ?? '');
                const isPlaceholderOpt = opt.value === '' && !!placeholder;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-[12px] transition-colors text-left',
                      isPlaceholderOpt
                        ? 'text-gray-400 hover:bg-gray-50'
                        : 'text-gray-700 hover:bg-gray-50',
                      isSelected && !isPlaceholderOpt && 'text-teal-700 bg-teal-50/60'
                    )}
                  >
                    {opt.label}
                    {isSelected && !isPlaceholderOpt && (
                      <Check className="w-3 h-3 text-teal-600 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="text-[11px] text-red-500">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';