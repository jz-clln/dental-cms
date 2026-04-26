'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

// Skeleton shapes per route
function getSkeletonForPath(path: string) {
  if (path.startsWith('/patients/') && path !== '/patients/new') return 'profile';
  if (path.startsWith('/patients')) return 'table';
  if (path.startsWith('/appointments')) return 'calendar';
  if (path.startsWith('/inventory')) return 'table';
  if (path.startsWith('/billing')) return 'billing';
  if (path.startsWith('/reports')) return 'reports';
  if (path.startsWith('/settings')) return 'settings';
  return 'dashboard';
}

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Shimmer className="h-8 w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Shimmer key={i} className="h-28" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Shimmer className="lg:col-span-3 h-72" />
        <Shimmer className="lg:col-span-2 h-72" />
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Shimmer className="h-10 w-56" />
        <Shimmer className="h-10 w-32" />
        <Shimmer className="h-10 w-24 ml-auto" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <Shimmer className="h-12 rounded-none" />
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-t border-gray-50">
            <Shimmer className="w-9 h-9 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Shimmer className="h-4 w-40" />
              <Shimmer className="h-3 w-28" />
            </div>
            <Shimmer className="h-6 w-16 rounded-full" />
            <Shimmer className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Shimmer className="h-8 w-32" />
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex gap-4">
          <Shimmer className="w-16 h-16 rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-6 w-48" />
            <Shimmer className="h-4 w-64" />
            <Shimmer className="h-4 w-40" />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-1.5 flex gap-1">
        {[1,2,3].map(i => <Shimmer key={i} className="flex-1 h-10" />)}
      </div>
      <Shimmer className="h-64 rounded-xl" />
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Shimmer className="h-10 w-24" />
        <Shimmer className="h-10 w-24" />
        <Shimmer className="h-10 w-32 ml-auto" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {[1,2,3,4,5,6,7].map(i => (
            <div key={i} className="p-3 border-r border-gray-50 last:border-r-0">
              <Shimmer className="h-4 w-8 mx-auto mb-2" />
              <Shimmer className="h-8 w-8 mx-auto rounded-full" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 min-h-[300px]">
          {[1,2,3,4,5,6,7].map(i => (
            <div key={i} className="p-2 border-r border-gray-50 last:border-r-0 space-y-2">
              {i % 3 !== 0 && <Shimmer className="h-14 rounded-lg" />}
              {i % 2 === 0 && <Shimmer className="h-14 rounded-lg" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BillingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Shimmer key={i} className="h-24" />)}
      </div>
      <TableSkeleton />
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Shimmer key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Shimmer className="lg:col-span-2 h-64" />
        <Shimmer className="h-64" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Shimmer className="h-48" />
        <Shimmer className="h-48" />
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 p-1.5 flex gap-1">
        {[1,2,3,4].map(i => <Shimmer key={i} className="flex-1 h-10" />)}
      </div>
      <Shimmer className="h-72 rounded-xl" />
    </div>
  );
}

const SKELETONS: Record<string, React.ReactNode> = {
  dashboard: <DashboardSkeleton />,
  table: <TableSkeleton />,
  profile: <ProfileSkeleton />,
  calendar: <CalendarSkeleton />,
  billing: <BillingSkeleton />,
  reports: <ReportsSkeleton />,
  settings: <SettingsSkeleton />,
};

export function PageLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [skeleton, setSkeleton] = useState<string>('dashboard');
  const prevPath = useRef<string>('');

  useEffect(() => {
    // Don't show loader on initial mount
    if (!prevPath.current) {
      prevPath.current = pathname;
      return;
    }

    // Only show if the path actually changed
    if (prevPath.current === pathname) return;

    setSkeleton(getSkeletonForPath(pathname));
    setLoading(true);

    // The skeleton shows for 400ms max — replaces itself with real content
    const t = setTimeout(() => setLoading(false), 400);
    prevPath.current = pathname;

    return () => clearTimeout(t);
  }, [pathname]);

  if (!loading) return null;

  return (
    <div
      className="absolute inset-0 z-10 bg-gray-50 animate-in fade-in-0 duration-150"
      style={{ paddingTop: 0 }}
    >
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {SKELETONS[skeleton] ?? <DashboardSkeleton />}
      </div>
    </div>
  );
}
