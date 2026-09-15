// src/lib/hooks/useToast.ts
'use client';

import { useState, useCallback, useMemo } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // FIX: this object was being recreated on every render (new reference
  // every time), even though addToast itself is a stable useCallback.
  // Any consumer that puts `toast` in a useEffect/useCallback dependency
  // array — like useDashboard's loadDashboard — saw a "changed" dependency
  // on every single render, which retriggered the effect that calls it,
  // which caused a re-render, which created a new toast object again.
  // That infinite loop was the dashboard's blinking skeleton. Wrapping it
  // in useMemo (with addToast as the only real dependency, which is
  // itself stable) keeps this reference stable across renders.
  const toast = useMemo<{
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
    warning: (msg: string) => void;
  }>(() => ({
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error'),
    info: (msg: string) => addToast(msg, 'info'),
    warning: (msg: string) => addToast(msg, 'warning'),
  }), [addToast]);

  return { toasts, toast, removeToast };
}