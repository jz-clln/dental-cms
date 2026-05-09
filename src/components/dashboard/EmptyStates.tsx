'use client';

import Link from 'next/link';
import { CalendarX, Activity, ArrowRight } from 'lucide-react';

// ─── Appointment empty state ───────────────────────────────────────────────

export function AppointmentsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
        <CalendarX className="w-5 h-5 text-gray-300" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-400">No appointments today</p>
        <p className="text-xs text-gray-300 mt-0.5">Add an appointment to see it here</p>
      </div>
      <Link
        href="/appointments/new"
        className="mt-1 text-xs font-semibold text-teal-700 hover:underline flex items-center gap-1"
      >
        Schedule an appointment <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

// ─── Activity empty state ──────────────────────────────────────────────────

export function ActivityEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center gap-2">
      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
        <Activity className="w-5 h-5 text-gray-300" />
      </div>
      <p className="text-sm font-medium text-gray-400">No recent activities</p>
      <p className="text-xs text-gray-300">Activity will appear here as you use the clinic.</p>
    </div>
  );
}

// ─── Loading skeleton ──────────────────────────────────────────────────────

function Bone({ className }: { className: string }) {
  return <div className={`bg-gray-100 rounded animate-pulse ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-3 sm:space-y-4 pb-8" aria-label="Loading dashboard…">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Bone className="h-6 w-40" />
          <Bone className="h-3 w-56" />
        </div>
        <Bone className="w-8 h-8 rounded-full" />
      </div>

      {/* Bitey hero */}
      <Bone className="h-[170px] rounded-2xl" />

      {/* Quick actions */}
      <div>
        <Bone className="h-3 w-24 mb-2" />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map(i => <Bone key={i} className="h-20 rounded-2xl" />)}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map(i => <Bone key={i} className="h-24 rounded-2xl" />)}
      </div>

      {/* Revenue card */}
      <Bone className="h-40 rounded-2xl" />

      {/* Appointments */}
      <Bone className="h-48 rounded-2xl" />

      {/* Activity */}
      <Bone className="h-48 rounded-2xl" />
    </div>
  );
}