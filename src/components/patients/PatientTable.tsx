'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Patient } from '@/types';
import { calculateAge, formatDateShort, getPatientName } from '@/lib/utils';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Search, ChevronUp, ChevronDown, UserX, UserPlus } from 'lucide-react';

type SortField = 'name' | 'age' | 'created_at';
type SortDir = 'asc' | 'desc';

interface PatientTableProps {
  patients: Patient[];
  loading?: boolean;
}

export function PatientTable({ patients, loading }: PatientTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

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
    if (!q) return patients;
    return patients.filter(p =>
      getPatientName(p).toLowerCase().includes(q) ||
      (p.contact_number ?? '').includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  }, [patients, search]);

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
      {/* Search + Add */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm
              focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent
              hover:border-gray-300 transition-colors"
          />
        </div>
        <Link href="/patients/new">
          <Button size="sm">
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Patient</span>
          </Button>
        </Link>
      </div>

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
                <th className="text-left px-5 py-3.5 font-medium text-gray-500">Contact Number</th>
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
                      {search ? 'No patients match your search.' : 'No patients yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                sorted.map(patient => (
                  <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
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
                        ? `${calculateAge(patient.birthday)} yrs`
                        : '—'}
                    </td>
                    <td className="px-5 py-4 text-gray-700">{patient.contact_number ?? '—'}</td>
                    <td className="px-5 py-4 text-gray-500 text-xs">{formatDateShort(patient.created_at)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/patients/${patient.id}`}
                        className="text-teal-700 hover:text-teal-800 font-medium text-sm hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden divide-y divide-gray-50">
          {sorted.length === 0 ? (
            <div className="text-center py-14">
              <UserX className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                {search ? 'No patients match your search.' : 'No patients yet.'}
              </p>
            </div>
          ) : (
            sorted.map(patient => (
              <Link
                key={patient.id}
                href={`/patients/${patient.id}`}
                className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-teal-700 font-semibold text-sm">
                    {patient.first_name[0]}{patient.last_name[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{getPatientName(patient)}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {calculateAge(patient.birthday) !== null ? `${calculateAge(patient.birthday)} yrs` : ''}
                    {patient.contact_number ? ` · ${patient.contact_number}` : ''}
                  </p>
                </div>
                <span className="text-gray-300 text-lg">›</span>
              </Link>
            ))
          )}
        </div>

        {/* Footer count */}
        {sorted.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-50 bg-gray-50">
            <p className="text-xs text-gray-400">
              Showing {sorted.length} of {patients.length} patient{patients.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
