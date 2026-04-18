'use client';

import { useState, useMemo } from 'react';
import { PatientBillingSummary } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { formatPeso, getPatientName } from '@/lib/utils';
import { Search, Receipt, Plus, CreditCard, ChevronRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatusFilter = 'All' | 'Unpaid' | 'Partial' | 'Paid';

interface BillingTableProps {
  summaries: PatientBillingSummary[];
  loading?: boolean;
  onAddCharge: (patientId?: string) => void;
  onRecordPayment: (patientId?: string, balance?: number) => void;
  onSelectPatient: (summary: PatientBillingSummary) => void;
}

export function BillingTable({
  summaries, loading, onAddCharge, onRecordPayment, onSelectPatient,
}: BillingTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');

  const filtered = useMemo(() => {
    return summaries.filter(s => {
      const matchSearch = getPatientName(s.patient)
        .toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'All' || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [summaries, search, statusFilter]);

  const STATUS_TABS: StatusFilter[] = ['All', 'Unpaid', 'Partial', 'Paid'];

  if (loading) return <SkeletonTable rows={8} />;

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
              placeholder="Search patient…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm w-48
                focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-gray-300 transition-colors"
            />
          </div>

          {/* Status tabs */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white">
            {STATUS_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={cn(
                  'px-3 py-2 text-xs font-medium transition-colors',
                  statusFilter === tab
                    ? 'bg-teal-700 text-white'
                    : 'text-gray-500 hover:bg-gray-50'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => onRecordPayment()}>
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Record Payment</span>
          </Button>
          <Button size="sm" onClick={() => onAddCharge()}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Charge</span>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3.5 font-medium text-gray-500">Patient</th>
                <th className="text-right px-5 py-3.5 font-medium text-gray-500">Total Billed</th>
                <th className="text-right px-5 py-3.5 font-medium text-gray-500">Total Paid</th>
                <th className="text-right px-5 py-3.5 font-medium text-gray-500">Balance</th>
                <th className="text-center px-5 py-3.5 font-medium text-gray-500">Status</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-14">
                    <Receipt className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">
                      {search || statusFilter !== 'All'
                        ? 'No records match your filters.'
                        : 'No billing records yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(s => (
                  <tr
                    key={s.patient.id}
                    onClick={() => onSelectPatient(s)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-teal-700 text-sm font-semibold">
                            {s.patient.first_name[0]}{s.patient.last_name[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{getPatientName(s.patient)}</p>
                          <p className="text-xs text-gray-400">{s.patient.contact_number ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right text-gray-700 font-medium">
                      {formatPeso(s.total_charged)}
                    </td>
                    <td className="px-5 py-4 text-right text-green-600 font-medium">
                      {formatPeso(s.total_paid)}
                    </td>
                    <td className={cn(
                      'px-5 py-4 text-right font-semibold',
                      s.balance > 0 ? 'text-red-600' : 'text-gray-400'
                    )}>
                      {formatPeso(s.balance)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <Badge label={s.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                        {s.balance > 0 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onRecordPayment(s.patient.id, s.balance)}
                            className="text-xs py-1"
                          >
                            Pay
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onAddCharge(s.patient.id)}
                          className="text-xs py-1"
                        >
                          + Charge
                        </Button>
                        <ChevronRight className="w-4 h-4 text-gray-300 ml-1" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <div className="text-center py-14">
              <Receipt className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No records match your filters.</p>
            </div>
          ) : (
            filtered.map(s => (
              <div
                key={s.patient.id}
                onClick={() => onSelectPatient(s)}
                className="px-4 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-teal-700 font-semibold text-sm">
                        {s.patient.first_name[0]}{s.patient.last_name[0]}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{getPatientName(s.patient)}</p>
                      <div className="flex gap-2 mt-0.5">
                        <Badge label={s.status} />
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn('font-semibold text-sm', s.balance > 0 ? 'text-red-600' : 'text-gray-400')}>
                      {formatPeso(s.balance)}
                    </p>
                    <p className="text-xs text-gray-400">balance</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer count */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-50 bg-gray-50">
            <p className="text-xs text-gray-400">
              {filtered.length} patient{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
