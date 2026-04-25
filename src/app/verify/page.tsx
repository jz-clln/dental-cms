'use client';

import { Suspense } from 'react';
import VerifyContent from './verifycontent';

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}