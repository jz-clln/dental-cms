'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Patient } from '@/types';
import { calculateAge, getPatientName } from '@/lib/utils';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Search, ChevronUp, ChevronDown,
  UserPlus, Archive, ArchiveRestore, Eye, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SortField = 'name' | 'age' | 'created_at';
type SortDir = 'asc' | 'desc';

interface PatientTableProps {
  patients: Patient[];
  loading?: boolean;
  onRefresh: () => void;
  toast: { success: (m: string) => void; error: (m: string) => void };
}

// ── Safe date formatter (fixes "Invalid Date") ──────────────────────────────
// Supabase returns ISO strings like "2026-01-15T08:23:00+00:00".
// We parse it explicitly so all browsers handle it correctly.
function formatRegistered(raw: string | null | undefined): string {
  if (!raw) return '—';
  const d = new Date(raw.replace(' ', 'T')); // handle both ISO and PG timestamp
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Initials avatar color — deterministic per patient
const AVATAR_PALETTES = [
  'bg-teal-100 text-teal-700',
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
];
function avatarPalette(id: string) {
  const sum = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_PALETTES[sum % AVATAR_PALETTES.length];
}

export function PatientTable({ patients, loading, onRefresh, toast }: PatientTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [showArchived, setShowArchived] = useState(false);

  const [archiveTarget, setArchiveTarget] = useState<Patient | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return patients.filter(p => {
      const isArchived = p.archived === true;
      const matchSearch = !q ||
        getPatientName(p).toLowerCase().includes(q) ||
        (p.contact_number ?? '').includes(q) ||
        p.id.toLowerCase().includes(q);
      const matchTab = showArchived ? isArchived : !isArchived;
      return matchSearch && matchTab;
    });
  }, [patients, search, showArchived]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = getPatientName(a).localeCompare(getPatientName(b));
      else if (sortField === 'age') cmp = (calculateAge(a.birthday) ?? -1) - (calculateAge(b.birthday) ?? -1);
      else if (sortField === 'created_at') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-teal-600" />
      : <ChevronDown className="w-3 h-3 text-teal-600" />;
  };

  const archivedCount = patients.filter(p => p.archived === true).length;

  async function handleArchiveToggle() {
    if (!archiveTarget) return;
    setArchiving(true);
    const supabase = createClient();
    const isArchived = archiveTarget.archived === true;
    const { error } = await supabase.from('patients').update({ archived: !isArchived }).eq('id', archiveTarget.id);
    if (error) toast.error(`Failed to ${isArchived ? 'restore' : 'archive'} patient.`);
    else {
      toast.success(isArchived
        ? `${getPatientName(archiveTarget)} has been restored.`
        : `${getPatientName(archiveTarget)} has been archived.`
      );
      onRefresh();
    }
    setArchiving(false);
    setArchiveTarget(null);
  }

  async function handlePermanentDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from('patients').delete().eq('id', deleteTarget.id);
    if (error) toast.error('Failed to delete patient. They may have linked records.');
    else { toast.success(`${getPatientName(deleteTarget)} has been permanently deleted.`); onRefresh(); }
    setDeleting(false);
    setDeleteTarget(null);
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 bg-gray-100 animate-pulse rounded-xl w-48" />
        <SkeletonTable rows={6} />
      </div>
    );
  }

  const visibleTotal = patients.filter(p => showArchived ? p.archived === true : p.archived !== true).length;

  return (
    <div className="space-y-3">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, phone, or ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-[12.5px] w-52
                focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400
                hover:border-gray-300 transition-colors placeholder:text-gray-300"
            />
          </div>

          {/* Archived toggle */}
          <button
            onClick={() => setShowArchived(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[12px] font-semibold transition-all',
              showArchived
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-100'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
            )}
          >
            <Archive className="w-3 h-3" />
            Archived
            {archivedCount > 0 && (
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                showArchived ? 'bg-amber-400/60 text-white' : 'bg-gray-100 text-gray-500'
              )}>
                {archivedCount}
              </span>
            )}
          </button>
        </div>

        <Link href="/patients/new">
          <Button size="sm">
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[12px]">Add Patient</span>
          </Button>
        </Link>
      </div>

      {/* Archived notice */}
      {showArchived && (
        <div className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 border border-amber-200/70 rounded-xl text-[12px] text-amber-800">
          <Archive className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
          Showing archived patients. Restore or permanently delete their records.
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {/* Column headers */}
                {(
                  [
                    { label: 'Patient', field: 'name' as SortField, px: 'px-5' },
                    { label: 'Age', field: 'age' as SortField, px: 'px-4' },
                    { label: 'Contact', field: null, px: 'px-4' },
                    { label: 'Registered', field: 'created_at' as SortField, px: 'px-4' },
                    { label: '', field: null, px: 'px-4' },
                  ] as const
                ).map(({ label, field, px }, i) => (
                  <th key={i} className={cn('text-left py-3 font-medium', px)}>
                    {field ? (
                      <button
                        onClick={() => toggleSort(field)}
                        className="flex items-center gap-1 text-[11px] text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
                      >
                        {label} <SortIcon field={field} />
                      </button>
                    ) : (
                      <span className="text-[11px] text-gray-400 uppercase tracking-wider">{label}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    {!search && !showArchived && <EmptyState type="patients" />}
                    {search && <EmptyState type="generic" title="No patients found" description={`No patients match "${search}".`} />}
                    {showArchived && !search && <EmptyState type="generic" title="No archived patients" description="Patients you archive will appear here." />}
                    {showArchived && search && <EmptyState type="generic" title="No archived patients found" description={`No archived patients match "${search}".`} />}
                  </td>
                </tr>
              ) : sorted.map(patient => {
                const isArchived = patient.archived === true;
                const palette = avatarPalette(patient.id);
                return (
                  <tr
                    key={patient.id}
                    className={cn(
                      'group transition-colors hover:bg-gray-50/70',
                      isArchived && 'opacity-60'
                    )}
                  >
                    {/* Name + avatar */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', palette)}>
                          <span className="text-[11px] font-bold">
                            {patient.first_name?.[0] ?? ''}{patient.last_name?.[0] ?? ''}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-gray-800 truncate leading-tight">{getPatientName(patient)}</p>
                          <p className="text-[11px] text-gray-400 truncate">{patient.email ?? '—'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Age */}
                    <td className="px-4 py-3">
                      <span className="text-[12.5px] text-gray-600 tabular-nums">
                        {calculateAge(patient.birthday) !== null ? `${calculateAge(patient.birthday)} yrs` : '—'}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      <span className="text-[12.5px] text-gray-600 tabular-nums">{patient.contact_number ?? '—'}</span>
                    </td>

                    {/* Registered — uses safe formatter */}
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-gray-400 tabular-nums">{formatRegistered(patient.created_at)}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isArchived && (
                          <Link
                            href={`/patients/${patient.id}`}
                            className="flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-50 px-2 py-1.5 rounded-lg transition-colors"
                          >
                            <Eye className="w-3 h-3" /> View
                          </Link>
                        )}
                        <button
                          onClick={() => setArchiveTarget(patient)}
                          title={isArchived ? 'Restore patient' : 'Archive patient'}
                          className={cn(
                            'flex items-center gap-1 text-[11px] font-semibold px-2 py-1.5 rounded-lg transition-colors',
                            isArchived
                              ? 'text-teal-600 hover:bg-teal-50'
                              : 'text-gray-400 hover:bg-amber-50 hover:text-amber-600'
                          )}
                        >
                          {isArchived
                            ? <><ArchiveRestore className="w-3 h-3" /> Restore</>
                            : <><Archive className="w-3 h-3" /> Archive</>
                          }
                        </button>
                        {isArchived && (
                          <button
                            onClick={() => setDeleteTarget(patient)}
                            className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Mobile cards ── */}
        <div className="md:hidden divide-y divide-gray-50">
          {sorted.length === 0 ? (
            <>
              {!search && !showArchived && <EmptyState type="patients" />}
              {search && <EmptyState type="generic" title="No patients found" description={`No patients match "${search}".`} />}
              {showArchived && !search && <EmptyState type="generic" title="No archived patients" description="Patients you archive will appear here." />}
            </>
          ) : sorted.map(patient => {
            const isArchived = patient.archived === true;
            const palette = avatarPalette(patient.id);
            return (
              <div
                key={patient.id}
                className={cn('flex items-center gap-3 px-4 py-3', isArchived && 'opacity-60')}
              >
                <div className={cn('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0', palette)}>
                  <span className="text-[11px] font-bold">
                    {patient.first_name?.[0] ?? ''}{patient.last_name?.[0] ?? ''}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-800 truncate">{getPatientName(patient)}</p>
                  <p className="text-[11px] text-gray-400">
                    {calculateAge(patient.birthday) !== null ? `${calculateAge(patient.birthday)} yrs` : ''}
                    {patient.contact_number ? ` · ${patient.contact_number}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!isArchived && (
                    <Link href={`/patients/${patient.id}`} className="text-teal-700 text-lg px-1 font-medium">›</Link>
                  )}
                  <button onClick={() => setArchiveTarget(patient)} className="p-1.5 text-gray-300 hover:text-amber-500 transition-colors">
                    {isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                  </button>
                  {isArchived && (
                    <button onClick={() => setDeleteTarget(patient)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer count */}
        {sorted.length > 0 && (
          <div className="px-5 py-2 border-t border-gray-50 bg-gray-50/60 flex items-center justify-between">
            <p className="text-[11px] text-gray-400 tabular-nums">
              {sorted.length} of {visibleTotal} patient{visibleTotal !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <ConfirmModal
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchiveToggle}
        loading={archiving}
        title={archiveTarget?.archived ? 'Restore Patient' : 'Archive Patient'}
        message={
          archiveTarget?.archived
            ? `Restore ${getPatientName(archiveTarget!)}? They will appear in the patient list again.`
            : `Archive ${getPatientName(archiveTarget!)}? They will be hidden from all lists but their records are kept.`
        }
        confirmLabel={archiveTarget?.archived ? 'Restore' : 'Archive'}
      />
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handlePermanentDelete}
        loading={deleting}
        title="Permanently Delete Patient"
        message={`This will permanently delete ${getPatientName(deleteTarget!)} and all their records. This cannot be undone.`}
        confirmLabel="Delete Permanently"
      />
    </div>
  );
}