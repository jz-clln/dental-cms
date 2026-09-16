// src/components/ui/DatePicker.tsx
//
// Wraps the existing `Calendar` (@/components/ui/calendar, react-day-picker
// v9) in a trigger + full-screen modal, matching this app's existing modal
// pattern (dim backdrop, centered white card, header row with a title and
// an X close button) rather than a small anchored popover. Doesn't touch
// calendar.tsx — the month/year quick-jump is added purely via props + a
// custom `Dropdown` override, so the base Calendar component stays exactly
// as it is.
//
// The modal opens the same way on desktop and mobile — no responsive
// branching, no bottom sheet, no anchored popover.
//
// The month/year quick-jump (captionLayout="dropdown") is rendered with a
// fully custom listbox (CustomCalendarDropdown below) instead of a native
// <select>, so opening it never falls back to the browser/OS's native
// picker UI — every option row is our own markup, styled with this
// project's tokens.
//
// FIX: `formatDate` used `en-GB` with `day: '2-digit', month: 'short'`,
// rendering as "09 Jan 2026". Display format is now fixed to
// "[Full Month] [Day], [Year]" (e.g. "January 9, 2026") everywhere this
// component is used, via `en-US` with `month: 'long', day: 'numeric'`.
//
// FIX: dropped the `classNames={{ month_caption: 'gap-1.5' }}` override
// that used to sit on the `<Calendar />` call below — it was a gap on a
// single-child flex container, so it did nothing. The actual bug (month
// and year buttons stacking instead of sitting in a row) was that
// react-day-picker's own wrapper around those two buttons — keyed
// `dropdowns` — had no styling at all in calendar.tsx. That's fixed
// there now, which is also the more correct place for it since it's a
// structural fix, not a per-usage tweak.
//
// FIX: the month/year listbox in CustomCalendarDropdown just appeared
// instantly on `{open && (...)}` with no transition at all, so it read as
// static/dead next to everything else in the app that already uses
// `animate-in` (defined in global.css). Added `animate-in origin-top` to
// the `<ul>` — same fade + translateY entrance the rest of the app uses,
// scaled from the top so it reads as unfolding from the trigger button
// instead of just popping into place. No exit animation yet since that'd
// need the list to stay mounted for a beat after `open` flips false
// (delayed unmount / AnimatePresence) rather than unmounting immediately,
// which is a bigger change than this fix — call it out if that's wanted.
//
// FEATURE: added a "Today" button in the modal header, beside the X.
// Deliberately navigates only — it moves the calendar's displayed month
// to the current month so you're not stuck manually working the
// month/year dropdowns to get back there, but it does NOT select today's
// date or close the modal. This is a shared component used for birthdays
// as well as appointment dates, and auto-selecting "today" is exactly
// wrong for the birthday case, so navigation-only is the safe default
// here. If a quick "set to today and close" action is what's actually
// wanted (makes sense for appointments, not birthdays), that'd need a
// per-usage prop rather than always-on behavior — flag it if so.
// Needed `Calendar`'s month to go from uncontrolled (`defaultMonth`) to
// controlled (`month` + `onMonthChange`) so an outside button can drive
// it; a `useEffect` resets that state back to the right starting point
// every time the modal opens, matching what `defaultMonth` used to do
// for free by simply remounting.

'use client';

import * as React from 'react';
import type { DropdownProps, Matcher } from 'react-day-picker';
import { Calendar as CalendarIcon, ChevronDown, X } from 'lucide-react';
import { Calendar } from '@/components/ui/Calendar';
import { cn } from '@/lib/utils';

export interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Earliest selectable year in the month/year dropdowns. Defaults to 100 years ago (good for birthdays). */
  fromYear?: number;
  /** Latest selectable year in the month/year dropdowns. Defaults to the current year. */
  toYear?: number;
  /** Earliest selectable date — dates before this are disabled. */
  minDate?: Date;
  /** Latest selectable date — dates after this are disabled. */
  maxDate?: Date;
  className?: string;
  /** Modal header title. Defaults to `label`, then "Select date". */
  mobileTitle?: string;
}

// Fixed display format: "[Full Month Name] [Day], [Year]" — e.g. "January 9, 2026".
// This is the single source of truth for how DatePicker shows a date, so every
// screen using this component renders dates the same way.
function formatDate(date?: Date) {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Fully custom replacement for react-day-picker's month/year caption
 * control. Deliberately does NOT render a native <select> — on touch
 * devices a <select> always opens the OS's own picker UI no matter how
 * it's styled, which is exactly what this avoids. Instead it's a small
 * button + absolutely-positioned listbox, built and styled entirely with
 * this project's own tokens.
 */
function CustomCalendarDropdown({ options = [], value, onChange, disabled, className }: DropdownProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  const selected = options.find(o => String(o.value) === String(value));

  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  React.useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [open]);

  function selectValue(v: string | number) {
    // DayPicker's onChange expects a native-select change event; a minimal
    // stand-in with the field it actually reads (target.value) is enough.
    onChange?.({ target: { value: String(v) } } as React.ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-1 rounded-md border border-gray-200 bg-white px-1.5 py-1 text-xs font-medium text-ink-700',
          'hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      >
        {selected?.label ?? value}
        <ChevronDown className={cn('h-3 w-3 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          className="absolute left-0 top-full z-10 mt-1 max-h-48 w-max min-w-full origin-top overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-card animate-in"
        >
          {options.map(option => {
            const active = String(option.value) === String(value);
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={active}
                data-active={active}
                onClick={() => !option.disabled && selectValue(option.value)}
                className={cn(
                  'cursor-pointer whitespace-nowrap px-3 py-1.5 text-xs',
                  active ? 'bg-teal-50 font-medium text-teal-700' : 'text-ink-700 hover:bg-gray-50',
                  option.disabled && 'cursor-not-allowed opacity-40',
                )}
              >
                {option.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function DatePicker({
  value,
  onChange,
  label,
  placeholder = 'Select date',
  disabled,
  fromYear = new Date().getFullYear() - 100,
  toYear = new Date().getFullYear(),
  minDate,
  maxDate,
  className,
  mobileTitle,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  // Controlled month state — needed so the "Today" button can move the
  // calendar's displayed month from outside it. Reset to the right
  // starting point every time the modal opens (see effect below), same
  // starting point `defaultMonth` used to compute.
  const [month, setMonth] = React.useState<Date>(value ?? new Date(toYear, 0, 1));

  React.useEffect(() => {
    if (open) setMonth(value ?? new Date(toYear, 0, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  // Escape to close, and lock body scroll while the modal is open.
  React.useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleSelect(date: Date | undefined) {
    onChange(date);
    close();
  }

  const disabledMatchers: Matcher[] = [];
  if (minDate) disabledMatchers.push({ before: minDate });
  if (maxDate) disabledMatchers.push({ after: maxDate });
  const disabledMatcher = disabledMatchers.length > 0 ? disabledMatchers : undefined;

  return (
    <div className={cn('relative', className)}>
      {label && (
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </label>
      )}

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5',
          'text-sm text-ink-700 transition-colors hover:border-gray-300',
          'focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400',
          disabled && 'cursor-not-allowed opacity-50',
          !value && 'text-gray-400',
        )}
      >
        <span>{value ? formatDate(value) : placeholder}</span>
        <CalendarIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
      </button>

      {/* Full-screen modal — identical on desktop and mobile */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
          onMouseDown={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={mobileTitle || label || 'Select date'}
            onMouseDown={e => e.stopPropagation()}
            className="animate-settle w-full max-w-[320px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card-hover"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <span className="text-sm font-semibold text-ink-700">
                {mobileTitle || label || 'Select date'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMonth(new Date())}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50 transition-colors"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex justify-center p-3">
              <Calendar
                mode="single"
                selected={value}
                onSelect={handleSelect}
                captionLayout="dropdown"
                month={month}
                onMonthChange={setMonth}
                startMonth={new Date(fromYear, 0, 1)}
                endMonth={new Date(toYear, 11, 31)}
                disabled={disabledMatcher}
                components={{ Dropdown: CustomCalendarDropdown }}
                className="p-2"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}