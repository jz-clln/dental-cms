'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, XCircle, ExternalLink, Loader2, RefreshCw, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

interface PendingClinic {
  id: string;
  name: string;
  owner_name: string | null;
  email: string | null;
  business_address: string | null;
  dti_sec_number: string | null;
  dpa_signed_by: string | null;
  dpa_signed_at: string | null;
  verification_submitted_at: string | null;
  verification_status: string;
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function StorageLink({ clinicId, label, fileKey }: {
  clinicId: string;
  label: string;
  fileKey: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function getUrl() {
    if (url) { window.open(url, '_blank'); return; }
    setLoading(true);
    const supabase = createClient();

    // List files in this clinic's folder matching the key prefix
    const { data: files } = await supabase.storage
      .from('clinic-documents')
      .list(clinicId, { search: fileKey });

    if (!files || files.length === 0) {
      setLoading(false);
      alert(`No file found for: ${label}`);
      return;
    }

    // Get signed URL for the most recent match
    const path = `${clinicId}/${files[files.length - 1].name}`;
    const { data } = await supabase.storage
      .from('clinic-documents')
      .createSignedUrl(path, 60 * 60); // 1 hour

    if (data?.signedUrl) {
      setUrl(data.signedUrl);
      window.open(data.signedUrl, '_blank');
    }
    setLoading(false);
  }

  return (
    <button
      onClick={getUrl}
      disabled={loading}
      className="inline-flex items-center gap-1 text-xs text-teal-700 hover:underline disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
      {label}
    </button>
  );
}

// ------------------------------------------------------------
// Reject modal — inline, no extra Modal component needed
// ------------------------------------------------------------

function RejectModal({
  clinic,
  onConfirm,
  onCancel,
  loading,
}: {
  clinic: PendingClinic;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Reject Verification</h2>
        <p className="text-sm text-gray-500">
          Rejecting <strong>{clinic.name}</strong>. Provide a reason so the clinic
          knows what to fix before resubmitting.
        </p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. DTI certificate image is blurry. Please reupload a clear copy."
          rows={4}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
        <div className="flex gap-3">
          <Button
            variant="danger"
            loading={loading}
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim())}
          >
            Confirm Reject
          </Button>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Clinic row
// ------------------------------------------------------------

function ClinicRow({
  clinic,
  onApprove,
  onReject,
  actioning,
}: {
  clinic: PendingClinic;
  onApprove: (id: string) => void;
  onReject: (clinic: PendingClinic) => void;
  actioning: string | null;
}) {
  const busy = actioning === clinic.id;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">

      {/* Top row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900">{clinic.name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{clinic.email ?? '—'}</p>
        </div>
        <span className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
          <Clock className="w-3 h-3" /> Pending
        </span>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Owner</span>
          <p className="text-gray-700 font-medium">{clinic.owner_name ?? '—'}</p>
        </div>
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">DTI / SEC No.</span>
          <p className="text-gray-700 font-medium">{clinic.dti_sec_number ?? '—'}</p>
        </div>
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Business Address</span>
          <p className="text-gray-700">{clinic.business_address ?? '—'}</p>
        </div>
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Submitted</span>
          <p className="text-gray-700">{formatDate(clinic.verification_submitted_at)}</p>
        </div>
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">DPA Signed By</span>
          <p className="text-gray-700">{clinic.dpa_signed_by ?? '—'}</p>
        </div>
        <div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">DPA Signed At</span>
          <p className="text-gray-700">{formatDate(clinic.dpa_signed_at)}</p>
        </div>
      </div>

      {/* Document links */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Documents</p>
        <div className="flex flex-wrap gap-3">
          <StorageLink clinicId={clinic.id} label="DTI / SEC Certificate" fileKey="dti_cert" />
          <StorageLink clinicId={clinic.id} label="Valid ID"              fileKey="valid_id" />
          <StorageLink clinicId={clinic.id} label="PRC License"           fileKey="prc_license" />
          <StorageLink clinicId={clinic.id} label="BIR Registration"      fileKey="bir_reg" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1 border-t border-gray-100">
        <Button
          size="sm"
          onClick={() => onApprove(clinic.id)}
          loading={busy}
          disabled={!!actioning}
          className="flex items-center gap-1.5"
        >
          <CheckCircle2 className="w-4 h-4" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => onReject(clinic)}
          disabled={!!actioning}
          className="flex items-center gap-1.5"
        >
          <XCircle className="w-4 h-4" />
          Reject
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------

export default function AdminPage() {
  const [clinics, setClinics]       = useState<PendingClinic[]>([]);
  const [loading, setLoading]       = useState(true);
  const [actioning, setActioning]   = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingClinic | null>(null);
  const [rejectLoading, setRejectLoading] = useState(false);

  // ── Fetch pending clinics ──
  const fetchClinics = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clinics')
      .select(`
        id, name, email, owner_name, business_address,
        dti_sec_number, dpa_signed_by, dpa_signed_at,
        verification_submitted_at, verification_status
      `)
      .eq('verification_status', 'pending')
      .order('verification_submitted_at', { ascending: true });

    if (!error) setClinics(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchClinics(); }, [fetchClinics]);

  // ── Approve ──
  async function handleApprove(clinicId: string) {
    setActioning(clinicId);
    const supabase = createClient();
    const { error } = await supabase
      .from('clinics')
      .update({
        verification_status: 'verified',
        verified_at: new Date().toISOString(),
        rejected_reason: null,
      })
      .eq('id', clinicId);

    if (error) {
      alert('Failed to approve clinic. Please try again.');
    } else {
      setClinics(prev => prev.filter(c => c.id !== clinicId));
    }
    setActioning(null);
  }

  // ── Reject ──
  async function handleReject(reason: string) {
    if (!rejectTarget) return;
    setRejectLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('clinics')
      .update({
        verification_status: 'rejected',
        rejected_reason: reason,
        verified_at: null,
      })
      .eq('id', rejectTarget.id);

    if (error) {
      alert('Failed to reject clinic. Please try again.');
    } else {
      setClinics(prev => prev.filter(c => c.id !== rejectTarget.id));
      setRejectTarget(null);
    }
    setRejectLoading(false);
  }

  // ── Render ──
  return (
    <>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Clinic Verifications</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? 'Loading…' : `${clinics.length} clinic${clinics.length !== 1 ? 's' : ''} pending review`}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchClinics}
            disabled={loading}
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : clinics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-teal-600" />
            </div>
            <p className="font-medium text-gray-700">All clear</p>
            <p className="text-sm text-gray-400">No clinics are pending verification.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {clinics.map(clinic => (
              <ClinicRow
                key={clinic.id}
                clinic={clinic}
                onApprove={handleApprove}
                onReject={setRejectTarget}
                actioning={actioning}
              />
            ))}
          </div>
        )}

      </div>

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          clinic={rejectTarget}
          onConfirm={handleReject}
          onCancel={() => setRejectTarget(null)}
          loading={rejectLoading}
        />
      )}
    </>
  );
}