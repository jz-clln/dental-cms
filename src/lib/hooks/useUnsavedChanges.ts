'use client';

import { useEffect } from 'react';

export function useUnsavedChanges(isDirty: boolean, onBack?: () => void) {
  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = '';
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty || !onBack) return;

    window.history.pushState(null, '', window.location.href);

    function handlePopState() {
      window.history.pushState(null, '', window.location.href);
      onBack?.();
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDirty, onBack]);
}