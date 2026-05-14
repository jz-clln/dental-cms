'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useVerification } from '@/lib/hooks/useVerification';
import { DpaModal } from '@/components/settings/DpaModal';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  CheckCircle2, Clock, XCircle, ShieldCheck,
  Upload, FileText, Loader2, RefreshCw,
  ShieldAlert, Lock, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

interface FileField {
  key: 'dti_cert' | 'valid_id' | 'prc_license' | 'bir_reg';
  label: string;
  description: string;
}

const FILE_FIELDS: FileField[] = [
  { key: 'dti_cert',    label: 'DTI / SEC Certificate',  description: 'Business registration certificate' },
  { key: 'valid_id',    label: 'Valid Government ID',     description: "Owner's government-issued ID" },
  { key: 'prc_license', label: 'PRC License',             description: 'Professional Regulation Commission license' },
  { key: 'bir_reg',     label: 'BIR Registration',        description: 'Bureau of Internal Revenue certificate' },
];

interface FormState {
  owner_name: string;
  dti_sec_number: string;
  business_address: string;
}

interface FormErrors {
  owner_name?: string;
  dti_sec_number?: string;
  business_address?: string;
  dpa?: string;
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ------------------------------------------------------------
// Why verify notice — styled like DataBackupNotice
// ------------------------------------------------------------

function WhyVerifyNotice() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">
      <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
        <ShieldCheck className="w-4 h-4 text-teal-700" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-teal-900">Verify your clinic to stay DPA compliant</p>
        <p className="text-xs text-teal-600 mt-0.5">
          Required under RA 10173 · Verification is needed to continue using Bitey after your trial.
        </p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// File upload field
// ------------------------------------------------------------

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function FileUploadField({
  field,
  file,
  onChange,
}: {
  field: FileField;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (selected && selected.size > MAX_FILE_SIZE) {
      setSizeError(`File too large. Maximum size is 10MB (this file is ${(selected.size / 1024 / 1024).toFixed(1)}MB).`);
      e.target.value = ''; // reset input
      onChange(null);
      return;
    }
    setSizeError(null);
    onChange(selected);
  }

  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800">{field.label}</p>
        <p className="text-xs text-gray-400">{field.description}</p>
        {file && (
          <p className="text-xs text-teal-600 mt-0.5 truncate max-w-[200px]">{file.name}</p>
        )}
        {sizeError && (
          <p className="text-xs text-red-500 mt-0.5">{sizeError}</p>
        )}
      </div>
      <div className="flex-shrink-0">
        <input
          ref={ref}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
            file
              ? 'border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100'
              : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'
          )}
        >
          <Upload className="w-3.5 h-3.5" />
          {file ? 'Replace' : 'Upload'}
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Pending state card
// ------------------------------------------------------------

function PendingCard({ submittedAt }: { submittedAt: string | null }) {
  return (
    <div className="flex flex-col items-center text-center py-8 gap-3">
      <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
        <Clock className="w-7 h-7 text-amber-600" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900">Verification Under Review</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-xs">
          Your documents have been submitted and are being reviewed. This usually takes 1–3 business days.
        </p>
        {submittedAt && (
          <p className="text-xs text-gray-400 mt-2">Submitted on {formatDate(submittedAt)}</p>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Verified state card
// ------------------------------------------------------------

function VerifiedCard({ verifiedAt }: { verifiedAt: string | null }) {
  return (
    <div className="flex flex-col items-center text-center py-8 gap-3">
      <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center">
        <ShieldCheck className="w-7 h-7 text-teal-700" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900">Clinic Verified</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-xs">
          Your clinic has been verified and is compliant with the Data Privacy Act.
        </p>
        {verifiedAt && (
          <p className="text-xs text-gray-400 mt-2">Verified on {formatDate(verifiedAt)}</p>
        )}
      </div>
      <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 border border-teal-200 rounded-full">
        <CheckCircle2 className="w-4 h-4 text-teal-600" />
        <span className="text-sm font-medium text-teal-700">DPA Compliant</span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Rejected banner
// ------------------------------------------------------------

function RejectedBanner({ reason }: { reason: string | null }) {
  return (
    <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-4">
      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-red-700">Verification Rejected</p>
        <p className="text-sm text-red-600 mt-0.5">
          {reason ?? 'Your submission did not meet the requirements. Please review and resubmit.'}
        </p>
        <p className="text-xs text-red-400 mt-1">Please correct the issues below and resubmit.</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Main panel
// ------------------------------------------------------------

interface VerifyClinicPanelProps {
  clinicId: string;
  toast: { success: (m: string) => void; error: (m: string) => void };
}

export function VerifyClinicPanel({ clinicId, toast }: VerifyClinicPanelProps) {
  const { verification, loading, isUnverified, isPending, isVerified, isRejected, refresh } =
    useVerification(clinicId);

  const [form, setForm] = useState<FormState>({
    owner_name: '',
    business_address: '',
    dti_sec_number: '',
  });
  const [errors, setErrors]         = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const [files, setFiles] = useState<Record<string, File | null>>({
    dti_cert: null, valid_id: null, prc_license: null, bir_reg: null,
  });

  const [showDpa, setShowDpa]         = useState(false);
  const [dpaSigned, setDpaSigned]     = useState(false);
  const [dpaSignedBy, setDpaSignedBy] = useState('');

  // Pre-fill on rejected resubmit
  const [prefilled, setPrefilled] = useState(false);
  if (verification && !prefilled && (isUnverified || isRejected)) {
    setForm({
      owner_name:       verification.owner_name       ?? '',
      business_address: verification.business_address ?? '',
      dti_sec_number:   verification.dti_sec_number   ?? '',
    });
    if (verification.dpa_signed_by) {
      setDpaSigned(true);
      setDpaSignedBy(verification.dpa_signed_by);
    }
    setPrefilled(true);
  }

  function validate(): boolean {
    const e: FormErrors = {};
    if (!form.owner_name.trim())       e.owner_name       = 'Owner name is required.';
    if (!form.dti_sec_number.trim())   e.dti_sec_number   = 'DTI / SEC number is required.';
    if (!form.business_address.trim()) e.business_address = 'Business address is required.';
    if (!dpaSigned)                    e.dpa              = 'You must sign the DPA agreement.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function clearOldFiles(): Promise<void> {
    const supabase = createClient();
    // List all files in this clinic's folder
    const { data: existingFiles, error: listError } = await supabase.storage
      .from('clinic-documents')
      .list(clinicId);

    if (listError) {
      console.warn('[clearOldFiles] Could not list files:', listError.message);
      return; // non-fatal — proceed with upload anyway
    }

    if (!existingFiles || existingFiles.length === 0) return;

    const paths = existingFiles.map(f => `${clinicId}/${f.name}`);
    const { error: deleteError } = await supabase.storage
      .from('clinic-documents')
      .remove(paths);

    if (deleteError) {
      console.warn('[clearOldFiles] Could not delete old files:', deleteError.message);
      // non-fatal — still proceed with upload
    }
  }

  async function uploadFiles(): Promise<void> {
    const supabase = createClient();
    for (const field of FILE_FIELDS) {
      const file = files[field.key];
      if (!file) continue;
      // Double-check size before uploading (catches any bypass of UI validation)
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`${field.label} exceeds the 10MB size limit.`);
      }
      const ext  = file.name.split('.').pop();
      const path = `${clinicId}/${field.key}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('clinic-documents')
        .upload(path, file, { upsert: true });
      if (error) throw new Error(`Failed to upload ${field.label}: ${error.message}`);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const hasAnyFile = Object.values(files).some(Boolean);
    if (!hasAnyFile && !isRejected) {
      toast.error('Please upload at least one supporting document.');
      return;
    }

    setSubmitting(true);
    try {
      // Clear old files first on resubmit so storage stays clean
      if (isRejected) await clearOldFiles();
      await uploadFiles();

      const supabase = createClient();
      const { error } = await supabase
        .from('clinics')
        .update({
          verification_status:       'pending',
          owner_name:                form.owner_name.trim(),
          dti_sec_number:            form.dti_sec_number.trim(),
          business_address:          form.business_address.trim(),
          dpa_signed_at:             new Date().toISOString(),
          dpa_signed_by:             dpaSignedBy,
          verification_submitted_at: new Date().toISOString(),
          rejected_reason:           null,
        })
        .eq('id', clinicId);

      if (error) throw error;

      toast.success("Verification submitted! We'll review your documents within 1–3 business days.");
      await refresh();
    } catch (err: unknown) {
      console.error('[VerifyClinicPanel] submit error:', err);
      toast.error(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // ── Pending ──
  if (isPending) {
    return <PendingCard submittedAt={verification?.verification_submitted_at ?? null} />;
  }

  // ── Verified ──
  if (isVerified) {
    return <VerifiedCard verifiedAt={verification?.verified_at ?? null} />;
  }

  // ── Form (unverified or rejected) ──
  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Rejected banner */}
        {isRejected && (
          <RejectedBanner reason={verification?.rejected_reason ?? null} />
        )}

        {/* Why verify notice */}
        {isUnverified && <WhyVerifyNotice />}

        {/* Owner & Registration */}
        <div className="space-y-3">
          {/* Owner Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Owner Full Name</label>
            <input
              type="text"
              placeholder="e.g. Juan Dela Cruz"
              value={form.owner_name}
              onChange={e => setForm(p => ({ ...p, owner_name: e.target.value }))}
              className={cn(
                'w-full rounded-xl border px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500',
                errors.owner_name ? 'border-red-300' : 'border-gray-200'
              )}
            />
            {errors.owner_name && <p className="text-xs text-red-500">{errors.owner_name}</p>}
          </div>

          {/* DTI/SEC */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">DTI or SEC Registration Number</label>
            <input
              type="text"
              placeholder="e.g. DTI-123456 or SEC-A12345"
              value={form.dti_sec_number}
              onChange={e => setForm(p => ({ ...p, dti_sec_number: e.target.value }))}
              className={cn(
                'w-full rounded-xl border px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500',
                errors.dti_sec_number ? 'border-red-300' : 'border-gray-200'
              )}
            />
            {errors.dti_sec_number && <p className="text-xs text-red-500">{errors.dti_sec_number}</p>}
          </div>

          {/* Business Address */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Business Address</label>
            <input
              type="text"
              placeholder="Complete business address"
              value={form.business_address}
              onChange={e => setForm(p => ({ ...p, business_address: e.target.value }))}
              className={cn(
                'w-full rounded-xl border px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500',
                errors.business_address ? 'border-red-300' : 'border-gray-200'
              )}
            />
            {errors.business_address && <p className="text-xs text-red-500">{errors.business_address}</p>}
          </div>
        </div>

        {/* Document Uploads */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <h4 className="text-sm font-semibold text-gray-800">Supporting Documents</h4>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">PDF, JPG, or PNG — max 10MB each</p>
          </CardHeader>
          <CardBody className="pt-0">
            {FILE_FIELDS.map(field => (
              <FileUploadField
                key={field.key}
                field={field}
                file={files[field.key]}
                onChange={f => setFiles(prev => ({ ...prev, [field.key]: f }))}
              />
            ))}
          </CardBody>
        </Card>

        {/* DPA Agreement */}
        <div className="space-y-2">
          <div className={cn(
            'p-4 rounded-xl border transition-colors',
            dpaSigned
              ? 'bg-teal-50 border-teal-200'
              : errors.dpa
              ? 'bg-red-50 border-red-200'
              : 'bg-gray-50 border-gray-200'
          )}>
            {dpaSigned ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-teal-700 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  DPA signed by <span className="font-semibold">{dpaSignedBy}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDpa(true)}
                  className="text-xs text-teal-600 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Re-sign
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">Data Privacy Act Agreement</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Read and sign the DPA compliance agreement to continue.
                  </p>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowDpa(true)}>
                  Read & Sign
                </Button>
              </div>
            )}
          </div>
          {errors.dpa && <p className="text-xs text-red-500">{errors.dpa}</p>}
        </div>

        {/* Submit */}
        <div className="pt-1">
          <Button type="submit" loading={submitting} className="w-full">
            {isRejected ? 'Resubmit for Verification' : 'Submit for Verification'}
          </Button>
          <p className="text-xs text-gray-400 text-center mt-2">
            Processing takes 1–3 business days. You will be notified of the result.
          </p>
        </div>

      </form>

      <DpaModal
        open={showDpa}
        onClose={() => setShowDpa(false)}
        ownerName={form.owner_name}
        onAccept={(name) => {
          setDpaSigned(true);
          setDpaSignedBy(name);
          setErrors(p => ({ ...p, dpa: undefined }));
          setShowDpa(false);
        }}
      />
    </>
  );
}