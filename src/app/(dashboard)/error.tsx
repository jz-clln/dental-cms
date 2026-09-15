// src/app/(dashboard)/error.tsx
'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard route error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        Something went wrong loading the dashboard
      </h2>
      <p className="text-sm text-gray-500 mb-4 max-w-md">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-[#1a3d2b] text-white text-sm font-medium hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}