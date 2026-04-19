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
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard shortcut: "/" to open
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as Element).tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
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
    setResults([]);
  }

  const showDropdown = open && query.length >= 2;

  return (
    <div ref={containerRef} className="relative">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search… ( / )"
          className="w-40 sm:w-56 pl-9 pr-8 py-2 rounded-lg border border-gray-200 text-sm
            bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500
            focus:border-transparent hover:border-gray-300 transition-all"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full mt-2 left-0 w-80 bg-white rounded-xl border border-gray-100
          shadow-xl z-50 overflow-hidden animate-in">

          {loading ? (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              No results for "<span className="font-medium text-gray-600">{query}</span>"
            </div>
          ) : (
            <div>
              {/* Group by type */}
              {(['patient', 'appointment'] as const).map(type => {
                const group = results.filter(r => r.type === type);
                if (!group.length) return null;
                return (
                  <div key={type}>
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {type === 'patient' ? 'Patients' : 'Appointments'}
                      </p>
                    </div>
                    {group.map((result, i) => {
                      const globalIndex = results.indexOf(result);
                      return (
                        <button
                          key={result.id}
                          onClick={() => navigate(result)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                            selected === globalIndex ? 'bg-teal-50' : 'hover:bg-gray-50'
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
                            <p className="text-sm font-medium text-gray-900 truncate">{result.title}</p>
                            <p className="text-xs text-gray-400 truncate">{result.subtitle}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              <div className="px-4 py-2 border-t border-gray-50 bg-gray-50">
                <p className="text-xs text-gray-400">
                  ↑↓ navigate &nbsp;·&nbsp; Enter to open &nbsp;·&nbsp; Esc to close
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
