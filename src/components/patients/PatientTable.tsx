'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Patient } from '@/types';
import { calculateAge, formatDateShort, getPatientName } from '@/lib/utils';
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

export function PatientTable({ patients, loading, onRefresh, toast }: PatientTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [showArchived, setShowArchived] = useState(false);

  // Archive modal
  const [archiveTarget, setArchiveTarget] = useState<Patient | null>(null);
  const [archiving, setArchiving] = useState(false);

  // Permanent delete modal
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  // ── Filtering ───────────────────────────────────────────────
  // Key fix: use strict boolean check — null/undefined treated as not archived
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return patients.filter(p => {
      const isArchived = (p as any).archived === true;

      const matchSearch = !q ||
        getPatientName(p).toLowerCase().includes(q) ||
        (p.contact_number ?? '').includes(q) ||
        p.id.toLowerCase().includes(q);

      // Show archived only in archived view, hide them in normal view
      const matchTab = showArchived ? isArchived : !isArchived;

      return matchSearch && matchTab;
    });
  }, [patients, search, showArchived]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = getPatientName(a).localeCompare(getPatientName(b));
      } else if (sortField === 'age') {
        const ageA = calculateAge(a.birthday) ?? -1;
        const ageB = calculateAge(b.birthday) ?? -1;
        cmp = ageA - ageB;
      } else if (sortField === 'created_at') {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-teal-700" />
      : <ChevronDown className="w-3 h-3 text-teal-700" />;
  };

  const archivedCount = patients.filter(p => (p as any).archived === true).length;

  // ── Archive / Restore ───────────────────────────────────────
  async function handleArchiveToggle() {
    if (!archiveTarget) return;
    setArchiving(true);
    const supabase = createClient();
    const isArchived = (archiveTarget as any).archived === true;

    const { error } = await supabase
      .from('patients')
      .update({ archived: !isArchived })
      .eq('id', archiveTarget.id);

    if (error) {
      toast.error(`Failed to ${isArchived ? 'restore' : 'archive'} patient.`);
    } else {
      toast.success(
        isArchived
          ? `${getPatientName(archiveTarget)} has been restored.`
          : `${getPatientName(archiveTarget)} has been archived and hidden from the patient list.`
      );
      onRefresh();
    }
    setArchiving(false);
    setArchiveTarget(null);
  }

  // ── Permanent Delete ────────────────────────────────────────
  async function handlePermanentDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();

    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', deleteTarget.id);

    if (error) {
      toast.error('Failed to delete patient. They may have linked appointments or billing records.');
    } else {
      toast.success(`${getPatientName(deleteTarget)} has been permanently deleted.`);
      onRefresh();
    }
    setDeleting(false);
    setDeleteTarget(null);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-gray-100 animate-pulse rounded-lg w-full max-w-sm" />
        <SkeletonTable rows={8} />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, or ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm w-56
                focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-gray-300 transition-colors"
            />
          </div>

          {/* Archived toggle */}
          <button
            onClick={() => setShowArchived(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
              showArchived
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            )}
          >
            <Archive className="w-3.5 h-3.5" />
            Archived
            {archivedCount > 0 && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                showArchived ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'
              )}>
                {archivedCount}
              </span>
            )}
          </button>
        </div>

        <Link href="/patients/new">
          <Button size="sm">
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Patient</span>
          </Button>
        </Link>
      </div>

      {/* Archived banner */}
      {showArchived && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <Archive className="w-4 h-4 flex-shrink-0" />
          Showing archived patients. You can restore them or permanently delete their records.
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3.5 font-medium text-gray-500">
                  <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-gray-700">
                    Patient Name <SortIcon field="name" />
                  </button>
                </th>
                <th className="text-left px-5 py-3.5 font-medium text-gray-500">
                  <button onClick={() => toggleSort('age')} className="flex items-center gap-1 hover:text-gray-700">
                    Age <SortIcon field="age" />
                  </button>
                </th>
                <th className="text-left px-5 py-3.5 font-medium text-gray-500">Contact</th>
                <th className="text-left px-5 py-3.5 font-medium text-gray-500">
                  <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 hover:text-gray-700">
                    Registered <SortIcon field="created_at" />
                  </button>
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    {!search && !showArchived && <EmptyState type="patients" />}
                    {search && (
                      <EmptyState
                        type="generic"
                        title="No patients found"
                        description={`No patients match "${search}". Try a different name, phone number, or ID.`}
                      />
                    )}
                    {showArchived && !search && (
                      <EmptyState
                        type="generic"
                        title="No archived patients"
                        description="Patients you archive will appear here. Their records are always preserved."
                      />
                    )}
                    {showArchived && search && (
                      <EmptyState
                        type="generic"
                        title="No archived patients found"
                        description={`No archived patients match "${search}".`}
                      />
                    )}
                  </td>
                </tr>
              ) : (
                sorted.map(patient => {
                  const isArchived = (patient as any).archived === true;
                  return (
                    <tr
                      key={patient.id}
                      className={cn('hover:bg-gray-50 transition-colors', isArchived && 'opacity-70')}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-teal-700 text-sm font-semibold">
                              {patient.first_name[0]}{patient.last_name[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{getPatientName(patient)}</p>
                            <p className="text-xs text-gray-400">{patient.email ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-700">
                        {calculateAge(patient.birthday) !== null
                          ? `${calculateAge(patient.birthday)} yrs` : '—'}
                      </td>
                      <td className="px-5 py-4 text-gray-700">{patient.contact_number ?? '—'}</td>
                      <td className="px-5 py-4 text-gray-500 text-xs">{formatDateShort(patient.created_at)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 justify-end">
                          {/* View — only for active patients */}
                          {!isArchived && (
                            <Link
                              href={`/patients/${patient.id}`}
                              className="flex items-center gap-1 text-teal-700 hover:text-teal-800
                                font-medium text-sm hover:underline px-2 py-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </Link>
                          )}

                          {/* Archive / Restore */}
                          <button
                            onClick={() => setArchiveTarget(patient)}
                            title={isArchived ? 'Restore patient' : 'Archive patient'}
                            className={cn(
                              'flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg transition-colors',
                              isArchived
                                ? 'text-teal-600 hover:bg-teal-50'
                                : 'text-gray-400 hover:bg-amber-50 hover:text-amber-600'
                            )}
                          >
                            {isArchived
                              ? <><ArchiveRestore className="w-3.5 h-3.5" /> Restore</>
                              : <><Archive className="w-3.5 h-3.5" /> Archive</>
                            }
                          </button>

                          {/* Permanent delete — only in archived view */}
                          {isArchived && (
                            <button
                              onClick={() => setDeleteTarget(patient)}
                              title="Permanently delete"
                              className="flex items-center gap-1 text-xs font-medium px-2 py-1.5
                                rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-50">
          {sorted.length === 0 ? (
            <>
              {!search && !showArchived && <EmptyState type="patients" />}
              {search && (
                <EmptyState type="generic" title="No patients found"
                  description={`No patients match "${search}".`} />
              )}
              {showArchived && !search && (
                <EmptyState type="generic" title="No archived patients"
                  description="Patients you archive will appear here." />
              )}
            </>
          ) : (
            sorted.map(patient => {
              const isArchived = (patient as any).archived === true;
              return (
                <div
                  key={patient.id}
                  className={cn('flex items-center gap-3 px-4 py-4', isArchived && 'opacity-70')}
                >
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-teal-700 font-semibold text-sm">
                      {patient.first_name[0]}{patient.last_name[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{getPatientName(patient)}</p>
                    <p className="text-xs text-gray-500">
                      {calculateAge(patient.birthday) !== null ? `${calculateAge(patient.birthday)} yrs` : ''}
                      {patient.contact_number ? ` · ${patient.contact_number}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!isArchived && (
                      <Link href={`/patients/${patient.id}`} className="text-teal-700 text-xl px-1">›</Link>
                    )}
                    <button
                      onClick={() => setArchiveTarget(patient)}
                      className="p-1.5 text-gray-300 hover:text-amber-500 transition-colors"
                    >
                      {isArchived
                        ? <ArchiveRestore className="w-4 h-4" />
                        : <Archive className="w-4 h-4" />
                      }
                    </button>
                    {isArchived && (
                      <button
                        onClick={() => setDeleteTarget(patient)}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer count */}
        {sorted.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-50 bg-gray-50">
            <p className="text-xs text-gray-400">
              Showing {sorted.length} of {patients.filter(p =>
                showArchived
                  ? (p as any).archived === true
                  : (p as any).archived !== true
              ).length} patient{sorted.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Archive / Restore modal */}
      <ConfirmModal
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchiveToggle}
        loading={archiving}
        title={(archiveTarget as any)?.archived ? 'Restore Patient' : 'Archive Patient'}
        message={
          (archiveTarget as any)?.archived
            ? `Restore ${getPatientName(archiveTarget!)}? They will appear in the patient list again.`
            : `Archive ${getPatientName(archiveTarget!)}? They will be hidden from all lists but their records are kept. You can restore them anytime from the Archived tab.`
        }
        confirmLabel={(archiveTarget as any)?.archived ? 'Restore' : 'Archive'}
      />

      {/* Permanent delete modal */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handlePermanentDelete}
        loading={deleting}
        title="Permanently Delete Patient"
        message={`This will permanently delete ${getPatientName(deleteTarget!)} and all their records — appointments, visit notes, billing, and payments. This cannot be undone.`}
        confirmLabel="Delete Permanently"
      />
    </div>
  );
}
