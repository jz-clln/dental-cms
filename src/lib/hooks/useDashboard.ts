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
  initialLoaded: boolean; // FIX: tracks first load only — prevents skeleton blinking on silent refreshes
}

export function useDashboard(clinicId: string | null): UseDashboardResult {
  const { toast } = useToast();
  const [data, setData] = useState<DashboardState>(INITIAL_DASHBOARD);
  const [bitey, setBitey] = useState<BiteyState>(INITIAL_BITEY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadingRef    = useRef(false);
  const lastFocusLoad = useRef(0);
  const abortRef      = useRef<AbortController | null>(null);
  const initialLoaded = useRef(false); // FIX: never resets after first successful load

  const applyData = useCallback((next: DashboardState) => {
    setData(next);
    const isNewUser = detectNewUser(next.stats, next.activity);
    setBitey(deriveBiteyState(next.stats, next.appointments, isNewUser));
  }, []);

  const loadDashboard = useCallback(async (silent = false) => {
    if (!clinicId || loadingRef.current) return;

    if (silent && isCacheValid(clinicId)) {
      const entry = getCacheEntry(clinicId);
      if (entry) { applyData(entry.data); return; }
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    loadingRef.current = true;
    // FIX: only show loading spinner on initial load, not silent refreshes
    if (!silent && !initialLoaded.current) setLoading(true);

    try {
      const next = await fetchAll(clinicId, controller.signal);
      if (controller.signal.aborted) return;
      setCacheEntry(clinicId, next);
      applyData(next);
      initialLoaded.current = true; // FIX: mark initial load done — never triggers skeleton again
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      console.error('Dashboard load error:', err);
      if (!silent) toast.error('Failed to load dashboard data');
    } finally {
      if (!controller.signal.aborted) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, [clinicId, applyData, toast]);

  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, [loadDashboard, refreshing]);

  useEffect(() => {
    if (clinicId) loadDashboard();
  }, [clinicId, loadDashboard]);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

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
    const timer = setTimeout(() => setLoading(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!clinicId) return;
    const supabase = createClient();
    let debounce: ReturnType<typeof setTimeout>;

    const triggerRefresh = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => loadDashboard(true), 1500);
    };

    const channel = supabase
      .channel(`dashboard:${clinicId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `clinic_id=eq.${clinicId}` }, triggerRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients',     filter: `clinic_id=eq.${clinicId}` }, triggerRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments',     filter: `clinic_id=eq.${clinicId}` }, triggerRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items', filter: `clinic_id=eq.${clinicId}` }, triggerRefresh)
      .subscribe();

    return () => {
      clearTimeout(debounce);
      supabase.removeChannel(channel);
    };
  }, [clinicId, loadDashboard]);

  return { data, bitey, loading, refreshing, refresh, initialLoaded: initialLoaded.current };
}