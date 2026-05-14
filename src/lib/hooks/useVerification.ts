import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export type VerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'rejected';

export interface VerificationData {
  verification_status: VerificationStatus;
  dti_sec_number: string | null;
  owner_name: string | null;
  business_address: string | null;
  dpa_signed_at: string | null;
  dpa_signed_by: string | null;
  verified_at: string | null;
  rejected_reason: string | null;
  verification_submitted_at: string | null;
}

export interface UseVerificationResult {
  verification: VerificationData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isUnverified: boolean;
  isPending: boolean;
  isVerified: boolean;
  isRejected: boolean;
}

// ------------------------------------------------------------
// Default / empty state
// ------------------------------------------------------------

const DEFAULT_VERIFICATION: VerificationData = {
  verification_status: 'unverified',
  dti_sec_number: null,
  owner_name: null,
  business_address: null,
  dpa_signed_at: null,
  dpa_signed_by: null,
  verified_at: null,
  rejected_reason: null,
  verification_submitted_at: null,
};

// ------------------------------------------------------------
// Hook
// ------------------------------------------------------------

export function useVerification(clinicId: string | null): UseVerificationResult {
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  const fetchVerification = useCallback(async () => {
    if (!clinicId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data, error: sbError } = await supabase
        .from('clinics')
        .select(`
          verification_status,
          dti_sec_number,
          owner_name,
          business_address,
          dpa_signed_at,
          dpa_signed_by,
          verified_at,
          rejected_reason,
          verification_submitted_at
        `)
        .eq('id', clinicId)
        .single();

      if (sbError) throw sbError;

      setVerification(data ?? DEFAULT_VERIFICATION);
    } catch (err: unknown) {
      console.error('[useVerification] fetch error:', err);
      const message =
        err instanceof Error ? err.message : 'Failed to load verification status';
      setError(message);
      setVerification(DEFAULT_VERIFICATION);
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  // Initial load
  useEffect(() => {
    fetchVerification();
  }, [fetchVerification]);

  // Derived booleans
  const status = verification?.verification_status ?? 'unverified';

  return {
    verification,
    loading,
    error,
    refresh: fetchVerification,
    isUnverified: status === 'unverified',
    isPending:    status === 'pending',
    isVerified:   status === 'verified',
    isRejected:   status === 'rejected',
  };
}