'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Patient } from '@/types';
import { calculateAge, formatDateShort, getPatientName } from '@/lib/utils';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/Modal';
import {
  Search, ChevronUp, ChevronDown, UserX,
  UserPlus, Archive, ArchiveRestore, Eye,
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
  const [archiveTarget, setArchiveTarget] = useState<Patient | null>(null);
  const [archiving, setArchiving] = useState(false);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return patients.filter(p => {
      const matchSearch = !q ||
        getPatientName(p).toLowerCase().includes(q) ||
        (p.contact_number ?? '').includes(q) ||
        p.id.toLowerCase().includes(q);
      const matchArchived = showArchived
        ? (p as any).archived === true
        : (p as any).archived !== true;
      return matchSearch && matchArchived;
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
          : `${getPatientName(archiveTarget)} has been archived.`
      );
      onRefresh();
    }
    setArchiving(false);
    setArchiveTarget(null);
  }

  const archivedCount = patients.filter(p => (p as any).archived === true).length;

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

          {/* Archive toggle */}
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
          Showing archived patients. These are hidden from all other views but their records are preserved.
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Desktop table */}
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
                  <td colSpan={5} className="text-center py-14">
                    <UserX className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">
                      {search
                        ? 'No patients match your search.'
                        : showArchived
                          ? 'No archived patients.'
                          : 'No patients yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                sorted.map(patient => {
                  const isArchived = (patient as any).archived === true;
                  return (
                    <tr key={patient.id} className={cn(
                      'hover:bg-gray-50 transition-colors',
                      isArchived && 'opacity-60'
                    )}>
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
                        <div className="flex items-center gap-2 justify-end">
                          {!isArchived && (
                            <Link
                              href={`/patients/${patient.id}`}
                              className="flex items-center gap-1 text-teal-700 hover:text-teal-800 font-medium text-sm hover:underline"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </Link>
                          )}
                          <button
                            onClick={() => setArchiveTarget(patient)}
                            className={cn(
                              'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors',
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
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-gray-50">
          {sorted.length === 0 ? (
            <div className="text-center py-14">
              <UserX className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                {search ? 'No patients match your search.' : 'No patients yet.'}
              </p>
            </div>
          ) : (
            sorted.map(patient => {
              const isArchived = (patient as any).archived === true;
              return (
                <div key={patient.id} className={cn(
                  'flex items-center gap-3 px-4 py-4',
                  isArchived && 'opacity-60'
                )}>
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
                  <div className="flex items-center gap-1">
                    {!isArchived && (
                      <Link href={`/patients/${patient.id}`} className="text-teal-700 text-lg">›</Link>
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
                  </div>
                </div>
              );
            })
          )}
        </div>

        {sorted.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-50 bg-gray-50">
            <p className="text-xs text-gray-400">
              Showing {sorted.length} of {patients.filter(p =>
                showArchived ? (p as any).archived === true : (p as any).archived !== true
              ).length} patient{sorted.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Archive / Restore confirm modal */}
      <ConfirmModal
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchiveToggle}
        loading={archiving}
        title={(archiveTarget as any)?.archived ? 'Restore Patient' : 'Archive Patient'}
        message={
          (archiveTarget as any)?.archived
            ? `Restore ${getPatientName(archiveTarget!)}? They will appear in the patient list again.`
            : `Archive ${getPatientName(archiveTarget!)}? They will be hidden from all lists but their records will be kept. You can restore them at any time.`
        }
        confirmLabel={(archiveTarget as any)?.archived ? 'Restore' : 'Archive'}
      />
    </div>
  );
}
