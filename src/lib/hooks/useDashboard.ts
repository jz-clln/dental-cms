// src/lib/hooks/useDashboard.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/lib/hooks/useToast';
import type { DashboardState, BiteyState } from '@/types/dashboard';
import { fetchAll } from '@/lib/dashboardFetchers';
import {
  getCacheEntry, setCacheEntry, isCacheValid, CACHE_TTL,
  detectNewUser, deriveBiteyState, BITEY_MESSAGES,
} from '@/lib/dashboardHelpers';

const INITIAL_STATS = {
  todaysAppointments: 0,
  totalPatients: 0,
  lowStockAlerts: 0,
  revenueThisWeek: 0,
  revenueAverage: 0,
  dailyRevenue: [0, 0, 0, 0, 0, 0, 0],
};

const INITIAL_DASHBOARD: DashboardState = {
  stats: INITIAL_STATS,
  appointments: [],
  activity: [],
};

const INITIAL_BITEY: BiteyState = {
  emotion: 'new',
  message: BITEY_MESSAGES.new,
  isNewUser: true,
};

export interface UseDashboardResult {
  data: DashboardState;
  bitey: BiteyState;
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  initialLoaded: boolean;
}

export function useDashboard(clinicId: string | null): UseDashboardResult {
  const { toast } = useToast();
  const [data, setData] = useState<DashboardState>(INITIAL_DASHBOARD);
  const [bitey, setBitey] = useState<BiteyState>(INITIAL_BITEY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const loadingRef    = useRef(false);
  const pendingRefreshRef = useRef(false);
  const lastFocusLoad = useRef(0);
  const abortRef      = useRef<AbortController | null>(null);

  // FIX: `toast` from useToast() is now memoized at its source (see
  // useToast.ts), which already fixes the blinking-skeleton loop. This
  // ref is a second, independent safeguard: by reading toast through a
  // ref instead of putting it directly in loadDashboard's dependency
  // array, an identity change in `toast` — from this hook or any future
  // one — can never again cause loadDashboard to be recreated, and
  // therefore can never retrigger the `useEffect([clinicId,
  // loadDashboard])` below. Only an actual clinicId change should ever
  // restart the fetch.
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);

  const applyData = useCallback((next: DashboardState) => {
    setData(next);
    const isNewUser = detectNewUser(next.stats, next.activity);
    setBitey(deriveBiteyState(next.stats, next.appointments, isNewUser));
  }, []);

  const loadDashboard = useCallback(async (silent = false, force = false) => {
    if (!clinicId) return;
    if (loadingRef.current) {
      if (force || !silent) pendingRefreshRef.current = true;
      return;
    }

    if (silent && !force && isCacheValid(clinicId)) {
      const entry = getCacheEntry(clinicId);
      if (entry) { applyData(entry.data); return; }
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    loadingRef.current = true;
    if (!silent) setLoading(true);

    try {
      do {
        pendingRefreshRef.current = false;
        try {
          const next = await fetchAll(clinicId, controller.signal);
          if (controller.signal.aborted) return;
          setCacheEntry(clinicId, next);
          applyData(next);
          setInitialLoaded(true);
        } catch (err: unknown) {
          if (controller.signal.aborted) return;
          console.error('Dashboard load error:', err);
          if (!silent) toastRef.current.error('Failed to load dashboard data');
          setInitialLoaded(true);
        }
        // A change received during the fetch must get a fresh read afterward.
      } while (pendingRefreshRef.current && !controller.signal.aborted);
    } finally {
      if (!controller.signal.aborted) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, [clinicId, applyData]);

  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, [loadDashboard, refreshing]);

  useEffect(() => {
    if (clinicId) loadDashboard();
    return () => {
      abortRef.current?.abort();
      loadingRef.current = false;
      pendingRefreshRef.current = false;
    };
  }, [clinicId, loadDashboard]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onFocus = () => {
      const now = Date.now();
      if (now - lastFocusLoad.current < CACHE_TTL) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        lastFocusLoad.current = Date.now();
        loadDashboard(true);
      }, 300);
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearTimeout(timer);
    };
  }, [loadDashboard]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      setInitialLoaded(true); // safety net — don't skeleton-lock forever
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!clinicId) return;
    const supabase = createClient();
    let debounce: ReturnType<typeof setTimeout>;

    const triggerRefresh = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => loadDashboard(true, true), 1500);
    };

    const channel = supabase
      .channel(`dashboard:${clinicId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `clinic_id=eq.${clinicId}` }, triggerRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients',     filter: `clinic_id=eq.${clinicId}` }, triggerRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments',     filter: `clinic_id=eq.${clinicId}` }, triggerRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items', filter: `clinic_id=eq.${clinicId}` }, triggerRefresh)
      .subscribe(status => { if (status === 'SUBSCRIBED') triggerRefresh(); });

    return () => {
      clearTimeout(debounce);
      supabase.removeChannel(channel);
    };
  }, [clinicId, loadDashboard]);

  return { data, bitey, loading, refreshing, refresh, initialLoaded };
}