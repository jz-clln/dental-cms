// src/components/ui/calendar.tsx
//
// Adapted from the standard shadcn Calendar (react-day-picker v9) to use
// this project's own design tokens (teal / porcelain / ink, defined in
// tailwind.config.ts) instead of the generic shadcn CSS-variable theme
// (--primary, --accent, --foreground, --muted-foreground, etc.), which
// this project doesn't define. No dependency on @/components/ui/button.
//
// FIX: the month/year dropdown buttons (rendered by react-day-picker
// when captionLayout="dropdown") were stacking vertically instead of
// sitting on the same row as the prev/next arrows. react-day-picker
// wraps those two buttons in its own container, keyed `dropdowns` in
// classNames — that key was missing here entirely, so the wrapper fell
// back to being a plain block-level <div>, and two block elements
// (month button, year button) stack by default. Added `dropdowns` with
// `flex items-center gap-1.5` so they render side by side instead.

'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';
import { DayPicker } from 'react-day-picker';

import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components: userComponents,
  ...props
}: CalendarProps) {
  const defaultClassNames = {
    months: 'relative flex flex-col sm:flex-row gap-4',
    month: 'w-full',
    month_caption: 'relative mx-10 mb-1 flex h-9 items-center justify-center z-20',
    dropdowns: 'flex items-center justify-center gap-1.5',
    caption_label: 'text-sm font-medium text-ink-700',
    nav: 'absolute top-0 flex w-full justify-between z-10',
    button_previous: cn(
      'inline-flex items-center justify-center rounded-lg transition-colors',
      'size-9 p-0 text-gray-400 hover:bg-gray-100 hover:text-ink-700',
    ),
    button_next: cn(
      'inline-flex items-center justify-center rounded-lg transition-colors',
      'size-9 p-0 text-gray-400 hover:bg-gray-100 hover:text-ink-700',
    ),
    weekday: 'size-9 p-0 text-xs font-medium text-gray-400',
    day_button: cn(
      'relative flex size-9 items-center justify-center whitespace-nowrap rounded-lg p-0 text-ink-700 outline-offset-2',
      'group-[[data-selected]:not(.range-middle)]:[transition-property:color,background-color,border-radius,box-shadow] group-[[data-selected]:not(.range-middle)]:duration-150',
      'focus:outline-none group-data-[disabled]:pointer-events-none focus-visible:z-10',
      'hover:bg-gray-100 hover:text-ink-700',
      'group-data-[selected]:bg-teal-600 group-data-[selected]:text-white group-data-[selected]:hover:bg-teal-600',
      'group-data-[disabled]:text-ink-700/30 group-data-[disabled]:line-through',
      'group-data-[outside]:text-ink-700/30 group-data-[outside]:group-data-[selected]:text-white',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500/70',
      'group-[.range-start:not(.range-end)]:rounded-e-none group-[.range-end:not(.range-start)]:rounded-s-none group-[.range-middle]:rounded-none',
      'group-data-[selected]:group-[.range-middle]:bg-teal-50 group-data-[selected]:group-[.range-middle]:text-ink-700',
    ),
    day: 'group size-9 px-0 text-sm',
    range_start: 'range-start',
    range_end: 'range-end',
    range_middle: 'range-middle',
    today:
      '*:after:pointer-events-none *:after:absolute *:after:bottom-1 *:after:start-1/2 *:after:z-10 *:after:size-[3px] *:after:-translate-x-1/2 *:after:rounded-full *:after:bg-teal-600 [&[data-selected]:not(.range-middle)>*]:after:bg-white [&[data-disabled]>*]:after:bg-ink-700/30 *:after:transition-colors',
    outside: 'text-gray-400 data-selected:bg-teal-50/50 data-selected:text-gray-400',
    hidden: 'invisible',
    week_number: 'size-9 p-0 text-xs font-medium text-gray-400',
  };

  const mergedClassNames: typeof defaultClassNames = Object.keys(defaultClassNames).reduce(
    (acc, key) => ({
      ...acc,
      [key]: classNames?.[key as keyof typeof classNames]
        ? cn(
            defaultClassNames[key as keyof typeof defaultClassNames],
            classNames[key as keyof typeof classNames],
          )
        : defaultClassNames[key as keyof typeof defaultClassNames],
    }),
    {} as typeof defaultClassNames,
  );

  const defaultComponents = {
    Chevron: (props: any) => {
      if (props.orientation === 'left') {
        return <ChevronLeft size={16} strokeWidth={2} {...props} aria-hidden="true" />;
      }
      return <ChevronRight size={16} strokeWidth={2} {...props} aria-hidden="true" />;
    },
  };

  const mergedComponents = {
    ...defaultComponents,
    ...userComponents,
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('w-fit', className)}
      classNames={mergedClassNames}
      components={mergedComponents}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };