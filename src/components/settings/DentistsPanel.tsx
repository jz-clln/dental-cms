'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Dentist } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { Pencil, Trash2, Plus, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT: Record<string, string> = {
  Monday: 'M', Tuesday: 'T', Wednesday: 'W',
  Thursday: 'Th', Friday: 'F', Saturday: 'Sa', Sunday: 'Su',
};

interface DentistFormData {
  name: string;
  specialty: string;
  schedule_days: string[];
}

interface DentistFormErrors {
  name?: string;
}

interface DentistFormProps {
  clinicId: string;
  existing?: Dentist;
  onSuccess: () => void;
  onCancel: () => void;
  toast: { success: (m: string) => void; error: (m: string) => void };
}

function DentistForm({ clinicId, existing, onSuccess, onCancel, toast }: DentistFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<DentistFormErrors>({});
  const [form, setForm] = useState<DentistFormData>({
    name: existing?.name ?? '',
    specialty: existing?.specialty ?? '',
    schedule_days: existing?.schedule_days ?? [],
  });

  function toggleDay(day: string) {
    setForm(prev => ({
      ...prev,
      schedule_days: prev.schedule_days.includes(day)
        ? prev.schedule_days.filter(d => d !== day)
        : [...prev.schedule_days, day],
    }));
  }

  function validate(): boolean {
    const e: DentistFormErrors = {};
    if (!form.name.trim()) e.name = 'Dentist name is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const supabase = createClient();
    const payload = {
      clinic_id: clinicId,
      name: form.name.trim(),
      specialty: form.specialty.trim() || null,
      schedule_days: form.schedule_days.length > 0 ? form.schedule_days : null,
    };

    if (existing) {
      const { error } = await supabase
        .from('dentists').update(payload).eq('id', existing.id);
      if (error) { toast.error('Failed to update dentist.'); setLoading(false); return; }
      toast.success('Dentist updated.');
    } else {
      const { error } = await supabase.from('dentists').insert(payload);
      if (error) { toast.error('Failed to add dentist.'); setLoading(false); return; }
      toast.success(`Dr. ${form.name} added.`);
    }

    setLoading(false);
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Full Name"
        placeholder="Dr. Juan Dela Cruz"
        value={form.name}
        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
        error={errors.name}
        required
      />
      <Input
        label="Specialty"
        placeholder="e.g. General Dentistry, Orthodontics"
        value={form.specialty}
        onChange={e => setForm(p => ({ ...p, specialty: e.target.value }))}
      />

      {/* Schedule days picker */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Schedule Days</label>
        <div className="flex flex-wrap gap-2">
          {DAYS.map(day => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                form.schedule_days.includes(day)
                  ? 'bg-teal-700 text-white border-teal-700'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              )}
            >
              {day}
            </button>
          ))}
        </div>
        {form.schedule_days.length === 0 && (
          <p className="text-xs text-gray-400">No days selected — tap days to add schedule.</p>
        )}
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="submit" loading={loading}>{existing ? 'Save Changes' : 'Add Dentist'}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

/* ─── Panel ─────────────────────────────────────────────── */

interface DentistsPanelProps {
  dentists: Dentist[];
  clinicId: string;
  onRefresh: () => void;
  toast: { success: (m: string) => void; error: (m: string) => void };
}

export function DentistsPanel({ dentists, clinicId, onRefresh, toast }: DentistsPanelProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Dentist | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Dentist | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from('dentists').delete().eq('id', deleteTarget.id);
    if (error) {
      toast.error('Failed to delete dentist.');
    } else {
      toast.success(`${deleteTarget.name} removed.`);
      onRefresh();
    }
    setDeleting(false);
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-3">
      {/* List */}
      {dentists.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No dentists added yet.</p>
      ) : (
        <div className="space-y-2">
          {dentists.map(d => (
            <div key={d.id}
              className="flex items-center gap-3 px-4 py-3.5 bg-gray-50 rounded-xl border border-gray-100"
            >
              <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-teal-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{d.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {d.specialty ?? 'General Dentistry'}
                  {d.schedule_days?.length
                    ? ` · ${d.schedule_days.map(day => DAY_SHORT[day] ?? day).join(', ')}`
                    : ''}
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => setEditTarget(d)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-white hover:text-gray-600 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteTarget(d)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button size="sm" variant="secondary" onClick={() => setShowAdd(true)}>
        <Plus className="w-4 h-4" /> Add Dentist
      </Button>

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Dentist" size="md">
        <DentistForm
          clinicId={clinicId}
          onSuccess={() => { setShowAdd(false); onRefresh(); }}
          onCancel={() => setShowAdd(false)}
          toast={toast}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Dentist" size="md">
        {editTarget && (
          <DentistForm
            clinicId={clinicId}
            existing={editTarget}
            onSuccess={() => { setEditTarget(null); onRefresh(); }}
            onCancel={() => setEditTarget(null)}
            toast={toast}
          />
        )}
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Remove Dentist"
        message={`Remove ${deleteTarget?.name} from your clinic? Their past appointments will remain in the system.`}
        confirmLabel="Remove"
      />
    </div>
  );
}
