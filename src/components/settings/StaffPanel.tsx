'use client';

import { useState } from 'react';
import { Staff } from '@/types';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { Trash2, Plus, ShieldCheck, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createStaffMember, deleteStaffMember } from '@/app/actions/staffActions';

// ─── Add Staff Form ───────────────────────────────────────────

interface AddStaffFormProps {
  clinicId: string;
  onSuccess: () => void;
  onCancel: () => void;
  toast: { success: (m: string) => void; error: (m: string) => void };
}

interface StaffFormErrors {
  full_name?: string;
  email?: string;
  password?: string;
}

function AddStaffForm({ clinicId, onSuccess, onCancel, toast }: AddStaffFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<StaffFormErrors>({});
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'front_desk' as 'admin' | 'front_desk',
  });

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof StaffFormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): boolean {
    const e: StaffFormErrors = {};
    if (!form.full_name.trim()) e.full_name = 'Full name is required.';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Enter a valid email address.';
    }
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const result = await createStaffMember({
      clinic_id: clinicId,
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      password: form.password,
      role: form.role,
    });

    if (result.error) {
      toast.error(
        result.error.includes('already registered')
          ? 'That email is already in use.'
          : 'Failed to add staff member. Please try again.'
      );
    } else {
      toast.success(`${form.full_name} has been added. Share their email and password with them directly.`);
      onSuccess();
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Full Name"
        placeholder="Maria Santos"
        value={form.full_name}
        onChange={e => set('full_name', e.target.value)}
        error={errors.full_name}
        required
      />
      <Input
        label="Email Address"
        type="email"
        placeholder="staff@clinic.com"
        value={form.email}
        onChange={e => set('email', e.target.value)}
        error={errors.email}
        required
      />
      <Input
        label="Temporary Password"
        type="password"
        placeholder="Min. 8 characters"
        value={form.password}
        onChange={e => set('password', e.target.value)}
        error={errors.password}
        required
      />
      <Select
        label="Role"
        value={form.role}
        onChange={e => set('role', e.target.value)}
      >
        <option value="front_desk">Front Desk</option>
        <option value="admin">Admin</option>
      </Select>

      <div className="flex gap-3 pt-1">
        <Button type="submit" loading={loading}>Add Staff Member</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

// ─── Staff Panel ──────────────────────────────────────────────

interface StaffPanelProps {
  staff: Staff[];
  currentStaffId: string;
  clinicId: string;
  onRefresh: () => void;
  toast: { success: (m: string) => void; error: (m: string) => void };
}

export function StaffPanel({ staff, currentStaffId, clinicId, onRefresh, toast }: StaffPanelProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const result = await deleteStaffMember(deleteTarget.id);

    if (result.error) {
      toast.error('Failed to remove staff member. Please try again.');
    } else {
      toast.success(`${deleteTarget.full_name} has been removed.`);
      onRefresh();
    }

    setDeleting(false);
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-3">
      {staff.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No staff members yet.</p>
      ) : (
        <div className="space-y-2">
          {staff.map(s => {
            const isCurrentUser = s.id === currentStaffId;
            return (
              <div
                key={s.id}
                className="flex items-center gap-3 px-4 py-3.5 bg-gray-50 rounded-xl border border-gray-100"
              >
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-600 text-sm font-semibold">
                    {s.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 text-sm">{s.full_name}</p>
                    {isCurrentUser && (
                      <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-500 truncate">{s.email}</p>
                    <span className={cn(
                      'inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border flex-shrink-0',
                      s.role === 'admin'
                        ? 'bg-purple-50 text-purple-600 border-purple-200'
                        : 'bg-gray-100 text-gray-500 border-gray-200'
                    )}>
                      {s.role === 'admin'
                        ? <><ShieldCheck className="w-3 h-3" /> Admin</>
                        : <><UserCircle className="w-3 h-3" /> Front Desk</>
                      }
                    </span>
                  </div>
                </div>

                {!isCurrentUser && (
                  <button
                    onClick={() => setDeleteTarget(s)}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Button size="sm" variant="secondary" onClick={() => setShowAdd(true)}>
        <Plus className="w-4 h-4" /> Add Staff Member
      </Button>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Staff Member" size="md">
        <AddStaffForm
          clinicId={clinicId}
          onSuccess={() => { setShowAdd(false); onRefresh(); }}
          onCancel={() => setShowAdd(false)}
          toast={toast}
        />
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Remove Staff Member"
        message={`Remove ${deleteTarget?.full_name} from your clinic? They will lose access immediately.`}
        confirmLabel="Remove"
      />
    </div>
  );
}