// src/components/layout/GlobalSearch.tsx
//
// FIXES APPLIED:
// - `animate-in` was an undefined class (no plugin adds it, config has no
//   such keyframe) — it was doing nothing. Replaced with `animate-settle`,
//   your actual entrance animation, so the dropdown now settles into place
//   instead of hard-cutting in.
// - `shadow-xl` (generic Tailwind default) → `shadow-card-hover`, your own
//   teal-tinted elevated lift, for a floating panel like this.
// - Border swapped to `porcelain-200` instead of flat `gray-100`.
// - Input focus state was an instant `ring-2` snap. Your config already
//   defines a `focus-glow` keyframe specifically described as "a soft
//   radial pulse instead of an instant ring snap" — it was never used
//   anywhere. Wired it in here.
// - Result rows get `ease-out-quint` on their transition instead of the
//   default linear easing, matching the "considered" motion language.
//
// FEATURE (mobile icon-first search): below `sm`, the input used to sit
// permanently at a squeezed 130px, crowding the title next to it. It's now
// a single icon button by default; tapping it swaps in the full input in
// its place, growing (`flex-1`) to use the row's freed-up space instead of
// a hardcoded width. At `sm` and up nothing changed — the input is always
// visible there, same as before.
// - New `mobileExpanded` state drives this. The input element itself is
//   never unmounted (its wrapper just toggles `hidden`/`block`, with
//   `sm:block` always winning at `sm+`), so `inputRef` stays valid and a
//   `useEffect` keyed on `mobileExpanded` can reliably focus it right after
//   it becomes visible — calling `.focus()` before that would silently
//   fail on a `display:none` element.
// - Tapping outside collapses it back to the icon, but only if the query
//   is empty, so an in-progress search isn't lost by an accidental tap
//   elsewhere. Escape always clears and collapses.
// - The existing clear ("X") button now also appears whenever expanded on
//   mobile (not just when there's text), and collapses back to the icon.
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Patient, Appointment } from '@/types';
import { getPatientName, formatDate, formatTime } from '@/lib/utils';
import { Search, User, Calendar, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  type: 'patient' | 'appointment';
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Focus the input right after it becomes visible on mobile (it's
  // `display:none` until mobileExpanded flips true, so focusing any
  // earlier — e.g. in the click handler itself — would silently no-op).
  useEffect(() => {
    if (mobileExpanded) inputRef.current?.focus();
  }, [mobileExpanded]);

  // Close on outside click. On mobile, also collapse back to the icon —
  // but only if there's no query, so we don't wipe out a search in progress.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (!query) setMobileExpanded(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [query]);

  // Keyboard shortcut: "/" to open
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as Element).tagName)) {
        e.preventDefault();
        setMobileExpanded(true);
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
        setMobileExpanded(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const [patientsRes, apptsRes] = await Promise.all([
      supabase
        .from('patients')
        .select('*')
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,contact_number.ilike.%${q}%,email.ilike.%${q}%`)
        .eq('archived', false)
        .limit(5),
      supabase
        .from('appointments')
        .select('*, patient:patients(first_name, last_name)')
        .or(`treatment_type.ilike.%${q}%`)
        .order('appointment_date', { ascending: false })
        .limit(3),
    ]);

    const built: SearchResult[] = [];

    for (const p of (patientsRes.data ?? []) as Patient[]) {
      built.push({
        type: 'patient',
        id: p.id,
        title: getPatientName(p),
        subtitle: p.contact_number ?? p.email ?? 'No contact info',
        href: `/patients/${p.id}`,
      });
    }

    for (const a of (apptsRes.data ?? []) as Appointment[]) {
      built.push({
        type: 'appointment',
        id: a.id,
        title: getPatientName(a.patient) + ' — ' + a.treatment_type,
        subtitle: `${formatDate(a.appointment_date)} at ${formatTime(a.appointment_time)} · ${a.status}`,
        href: `/appointments?id=${a.id}`,
      });
    }

    setResults(built);
    setSelected(0);
    setLoading(false);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[selected];
      if (r) navigate(r);
    }
  }

  function navigate(result: SearchResult) {
    router.push(result.href);
    setOpen(false);
    setQuery('');
    setMobileExpanded(false);
    setResults([]);
  }

  function collapseMobile() {
    setQuery('');
    setResults([]);
    setOpen(false);
    setMobileExpanded(false);
  }

  const showDropdown = open && query.length >= 2;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative z-40 font-sans min-w-0',
        mobileExpanded ? 'flex-1' : 'flex-shrink-0',
      )}
    >
      {/* Mobile collapsed: icon-only trigger. Hidden at sm+ (input is always shown there)
          and hidden once expanded (the input below takes its place). */}
      {!mobileExpanded && (
        <button
          type="button"
          onClick={() => { setMobileExpanded(true); setOpen(true); }}
          aria-label="Open search"
          className="sm:hidden flex items-center justify-center w-10 h-10 rounded-lg border border-porcelain-200
            bg-porcelain-50 text-gray-500 hover:border-porcelain-300 hover:text-ink-900 transition-colors active:animate-press"
        >
          <Search className="w-4 h-4" />
        </button>
      )}

      {/* Input + dropdown — always visible at sm+; on mobile only once expanded. */}
      <div className={cn(mobileExpanded ? 'block' : 'hidden', 'sm:block')}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search Bar"
            className="w-full sm:w-56 pl-9 pr-8 py-2 rounded-lg border border-porcelain-200 text-sm
            bg-porcelain-50 focus:bg-white focus:outline-none focus:animate-focus-glow
              focus:border-transparent hover:border-porcelain-300 transition-colors"
          />
          {(query || mobileExpanded) && (
            <button
              onClick={collapseMobile}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 active:animate-press"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute top-full mt-2 left-0 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-porcelain-200
            shadow-card-hover z-40 overflow-hidden animate-settle">

            {loading ? (
              <div className="flex items-center gap-2 px-4 py-4 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching…
              </div>
            ) : results.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                No results for "<span className="font-medium text-ink-800">{query}</span>"
              </div>
            ) : (
              <div>
                {/* Group by type */}
                {(['patient', 'appointment'] as const).map(type => {
                  const group = results.filter(r => r.type === type);
                  if (!group.length) return null;
                  return (
                    <div key={type}>
                      <div className="px-4 py-2 bg-porcelain-50 border-b border-porcelain-200">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          {type === 'patient' ? 'Patients' : 'Appointments'}
                        </p>
                      </div>
                      {group.map((result) => {
                        const globalIndex = results.indexOf(result);
                        return (
                          <button
                            key={result.id}
                            onClick={() => navigate(result)}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-200 ease-out-quint',
                              selected === globalIndex ? 'bg-teal-50' : 'hover:bg-porcelain-50'
                            )}
                          >
                            <div className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                              result.type === 'patient' ? 'bg-teal-100' : 'bg-blue-100'
                            )}>
                              {result.type === 'patient'
                                ? <User className="w-4 h-4 text-teal-700" />
                                : <Calendar className="w-4 h-4 text-blue-600" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-ink-900 truncate">{result.title}</p>
                              <p className="text-xs text-gray-400 truncate">{result.subtitle}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}

                <div className="px-4 py-2 border-t border-porcelain-200 bg-porcelain-50">
                  <p className="text-xs text-gray-400">
                    ↑↓ navigate &nbsp;·&nbsp; Enter to open &nbsp;·&nbsp; Esc to close
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}