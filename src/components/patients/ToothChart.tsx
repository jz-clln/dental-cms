'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/Modal';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { formatDateShort } from '@/lib/utils';
import { X, Plus, Trash2 } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────

interface ToothRecord {
  id: string;
  tooth_number: number;
  treatment_type: string;
  surface: string | null;
  notes: string | null;
  treated_at: string;
  created_at: string;
}

interface ToothChartProps {
  patientId: string;
  clinicId: string;
  toast: { success: (m: string) => void; error: (m: string) => void };
}

// ─── Constants ───────────────────────────────────────────────

const TREATMENT_TYPES = [
  'Filling','Extraction','Root Canal','Crown','Bridge','Implant',
  'Veneer','Sealant','Cleaning','Whitening','Braces','Missing','Decayed','Fractured',
];

const SURFACES = ['Mesial','Distal','Occlusal','Buccal','Lingual','Incisal','Full'];

const TREATMENT_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  'Filling':    { bg: '#dbeafe', border: '#93c5fd', text: '#1d4ed8', dot: '#3b82f6' },
  'Extraction': { bg: '#fee2e2', border: '#fca5a5', text: '#b91c1c', dot: '#ef4444' },
  'Root Canal': { bg: '#ede9fe', border: '#c4b5fd', text: '#6d28d9', dot: '#8b5cf6' },
  'Crown':      { bg: '#fef3c7', border: '#fcd34d', text: '#b45309', dot: '#f59e0b' },
  'Bridge':     { bg: '#ffedd5', border: '#fdba74', text: '#c2410c', dot: '#f97316' },
  'Implant':    { bg: '#cffafe', border: '#67e8f9', text: '#0e7490', dot: '#06b6d4' },
  'Veneer':     { bg: '#fce7f3', border: '#f9a8d4', text: '#be185d', dot: '#ec4899' },
  'Sealant':    { bg: '#ecfccb', border: '#bef264', text: '#4d7c0f', dot: '#84cc16' },
  'Cleaning':   { bg: '#ccfbf1', border: '#5eead4', text: '#0f766e', dot: '#14b8a6' },
  'Whitening':  { bg: '#f8fafc', border: '#cbd5e1', text: '#475569', dot: '#94a3b8' },
  'Braces':     { bg: '#e0e7ff', border: '#a5b4fc', text: '#4338ca', dot: '#6366f1' },
  'Missing':    { bg: '#f1f5f9', border: '#94a3b8', text: '#334155', dot: '#64748b' },
  'Decayed':    { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', dot: '#92400e' },
  'Fractured':  { bg: '#fee2e2', border: '#f87171', text: '#991b1b', dot: '#dc2626' },
};

const UPPER_TEETH = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
const LOWER_TEETH = [32,31,30,29,28,27,26,25,24,23,22,21,20,19,18,17];

const TOOTH_NAMES: Record<number, string> = {
  1:'Upper Right 3rd Molar', 2:'Upper Right 2nd Molar', 3:'Upper Right 1st Molar',
  4:'Upper Right 2nd Premolar', 5:'Upper Right 1st Premolar', 6:'Upper Right Canine',
  7:'Upper Right Lateral Incisor', 8:'Upper Right Central Incisor',
  9:'Upper Left Central Incisor', 10:'Upper Left Lateral Incisor',
  11:'Upper Left Canine', 12:'Upper Left 1st Premolar', 13:'Upper Left 2nd Premolar',
  14:'Upper Left 1st Molar', 15:'Upper Left 2nd Molar', 16:'Upper Left 3rd Molar',
  17:'Lower Left 3rd Molar', 18:'Lower Left 2nd Molar', 19:'Lower Left 1st Molar',
  20:'Lower Left 2nd Premolar', 21:'Lower Left 1st Premolar', 22:'Lower Left Canine',
  23:'Lower Left Lateral Incisor', 24:'Lower Left Central Incisor',
  25:'Lower Right Central Incisor', 26:'Lower Right Lateral Incisor',
  27:'Lower Right Canine', 28:'Lower Right 1st Premolar', 29:'Lower Right 2nd Premolar',
  30:'Lower Right 1st Molar', 31:'Lower Right 2nd Molar', 32:'Lower Right 3rd Molar',
};

function getToothShape(n: number): 'molar' | 'premolar' | 'anterior' {
  if ([1,2,3,14,15,16,17,18,19,30,31,32].includes(n)) return 'molar';
  if ([4,5,12,13,20,21,28,29].includes(n)) return 'premolar';
  return 'anterior';
}

// ─── Single Tooth ────────────────────────────────────────────

interface ToothProps {
  number: number;
  record: ToothRecord | null;
  selected: boolean;
  onClick: () => void;
  isUpper: boolean;
  // FIX: scale factor for mobile
  scale: number;
}

function Tooth({ number, record, selected, onClick, isUpper, scale }: ToothProps) {
  const [hovered, setHovered] = useState(false);
  const shape = getToothShape(number);
  const cfg = record ? TREATMENT_COLORS[record.treatment_type] : null;

  // FIX: multiply all dimensions by scale so chart shrinks on mobile
  const baseW = shape === 'molar' ? 32 : shape === 'premolar' ? 26 : 20;
  const baseH = shape === 'molar' ? 34 : shape === 'premolar' ? 30 : 26;
  const w = Math.floor(baseW * scale);
  const h = Math.floor(baseH * scale);

  const bg     = selected ? (cfg ? cfg.bg : '#ccfbf1')     : cfg ? cfg.bg : '#f0f4f8';
  const border = selected ? (cfg ? cfg.border : '#5eead4') : cfg ? cfg.border : '#b0bec5';
  const shadow = selected
    ? '0 0 0 2px #0f766e'
    : hovered ? '0 1px 4px rgba(0,0,0,0.10)' : '0 1px 2px rgba(0,0,0,0.06)';

  return (
    <div className="flex flex-col items-center gap-0.5" style={{ width: w }}>
      {isUpper && (
        <span style={{ fontSize: Math.max(7, 8 * scale) }} className="text-gray-400 leading-none select-none">
          {number}
        </span>
      )}
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={`#${number} ${TOOTH_NAMES[number]}${record ? ` — ${record.treatment_type}` : ''}`}
        style={{
          width: w,
          height: h,
          backgroundColor: bg,
          border: `1.5px solid ${border}`,
          borderRadius: shape === 'anterior' ? Math.max(4, 8 * scale) : Math.max(3, 5 * scale),
          boxShadow: shadow,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {record && (
          <div style={{
            width: Math.max(4, 6 * scale),
            height: Math.max(4, 6 * scale),
            borderRadius: '50%',
            backgroundColor: cfg?.dot ?? '#94a3b8',
            opacity: 0.8,
          }} />
        )}
      </div>
      {!isUpper && (
        <span style={{ fontSize: Math.max(7, 8 * scale) }} className="text-gray-400 leading-none select-none">
          {number}
        </span>
      )}
    </div>
  );
}

// ─── Popover Content (shared between desktop + mobile) ────────

interface PopoverContentProps {
  toothNumber: number;
  records: ToothRecord[];
  onClose: () => void;
  onSave: (form: { treatment_type: string; surface: string; notes: string; treated_at: string }) => Promise<void>;
  onDeleteRecord: (rec: ToothRecord) => void;
  saving: boolean;
  contentRef?: React.RefObject<HTMLDivElement>;
}

function PopoverContent({
  toothNumber, records, onClose, onSave, onDeleteRecord, saving, contentRef,
}: PopoverContentProps) {
  const [form, setForm] = useState({
    treatment_type: 'Filling',
    surface: 'Full',
    notes: '',
    treated_at: new Date().toLocaleDateString('en-CA'),
  });

  useEffect(() => {
    setForm(f => ({ ...f, notes: '' }));
  }, [toothNumber]);

  return (
    <div ref={contentRef}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <p className="font-semibold text-gray-900 text-sm">Tooth #{toothNumber}</p>
          <p className="text-[11px] text-gray-400 leading-tight">{TOOTH_NAMES[toothNumber]}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Existing records */}
        {records.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {records.map(rec => {
              const cfg = TREATMENT_COLORS[rec.treatment_type];
              return (
                <div
                  key={rec.id}
                  className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: cfg?.bg, border: `1px solid ${cfg?.border}`, color: cfg?.text }}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg?.dot }} />
                  {rec.treatment_type}
                  <span className="opacity-60">{formatDateShort(rec.treated_at)}</span>
                  <button
                    onClick={() => onDeleteRecord(rec)}
                    className="opacity-0 group-hover:opacity-100 ml-0.5 hover:text-red-500 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Form */}
        <div className="grid grid-cols-2 gap-2">
          <CustomSelect
            label="Treatment"
            value={form.treatment_type}
            onChange={v => setForm(f => ({ ...f, treatment_type: v }))}
            options={TREATMENT_TYPES.map(t => ({ value: t, label: t }))}
          />
          <CustomSelect
            label="Surface"
            value={form.surface}
            onChange={v => setForm(f => ({ ...f, surface: v }))}
            options={SURFACES.map(s => ({ value: s, label: s }))}
          />
        </div>

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Date</label>
            <input
              type="date"
              value={form.treated_at}
              onChange={e => setForm(f => ({ ...f, treated_at: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <Button
            onClick={() => onSave(form).then(() => setForm(f => ({ ...f, notes: '' })))}
            loading={saving}
            size="sm"
          >
            <Plus className="w-3.5 h-3.5" /> Log
          </Button>
        </div>

        <textarea
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder:text-gray-400 resize-none"
        />
      </div>
    </div>
  );
}

// ─── Floating Popover ─────────────────────────────────────────

interface PopoverProps {
  toothNumber: number;
  records: ToothRecord[];
  onClose: () => void;
  onSave: (form: { treatment_type: string; surface: string; notes: string; treated_at: string }) => Promise<void>;
  onDeleteRecord: (rec: ToothRecord) => void;
  saving: boolean;
  anchorRef: React.RefObject<HTMLDivElement>;
}

function ToothPopover(props: PopoverProps) {
  const { onClose, anchorRef } = props;
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mobile = window.innerWidth < 640;
    setIsMobile(mobile);

    if (!mobile && anchorRef.current && popoverRef.current) {
      const anchor  = anchorRef.current.getBoundingClientRect();
      const popover = popoverRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;

      let left = anchor.left + anchor.width / 2 - popover.width / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - popover.width - 8));

      let top = anchor.bottom + scrollY + 8;
      if (anchor.bottom + popover.height + 8 > window.innerHeight) {
        top = anchor.top + scrollY - popover.height - 8;
      }

      setPosition({ top, left });
    }
  }, [props.toothNumber, anchorRef]);

  // Outside click to close
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose, anchorRef]);

  // Escape to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // ── Mobile: bottom sheet with blur backdrop ───────────────
  // FIX: backdrop-blur instead of plain black overlay
  // FIX: no drag handle pill (removed the white line gap)
  if (isMobile) {
    return (
      <>
        {/* FIX: blurred backdrop — no white gap line */}
        <div
          className="fixed inset-0 z-40"
          onMouseDown={onClose}
        />
        {/* FIX: sheet starts right at the content, no extra top padding */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.15)]">
          {/* Drag handle sits flush inside the sheet, not above it */}
          <div className="flex justify-center py-2">
            <div className="w-8 h-1 rounded-full bg-gray-200" />
          </div>
          <PopoverContent {...props} />
        </div>
      </>
    );
  }

  // ── Desktop: floating popover (unchanged) ─────────────────
  return (
    <div
      className="fixed z-50 bg-white rounded-2xl border border-gray-200 shadow-xl"
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        width: 320,
        visibility: position ? 'visible' : 'hidden',
        opacity: position ? 1 : 0,
        transition: 'opacity 0.15s ease',
      }}
    >
      <PopoverContent {...props} contentRef={popoverRef} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export function ToothChart({ patientId, clinicId, toast }: ToothChartProps) {
  const [records, setRecords] = useState<ToothRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ToothRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // FIX: measure container width and derive scale so chart always fits
  const [chartScale, setChartScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function measure() {
      if (!containerRef.current) return;
      const containerW = containerRef.current.offsetWidth - 32; // subtract padding
      // Full-size chart needs ~560px (16 teeth × avg 35px)
      const FULL_WIDTH = 560;
      const scale = Math.min(1, containerW / FULL_WIDTH);
      setChartScale(scale);
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('tooth_records')
      .select('*')
      .eq('patient_id', patientId)
      .order('treated_at', { ascending: true });
    setRecords((data ?? []) as ToothRecord[]);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  function getLatestRecord(n: number): ToothRecord | null {
    const toothRecs = records.filter(r => r.tooth_number === n);
    return toothRecs.length > 0 ? toothRecs[toothRecs.length - 1] : null;
  }

  function handleToothClick(n: number) {
    setSelectedTooth(prev => prev === n ? null : n);
  }

  async function handleSave(form: {
    treatment_type: string;
    surface: string;
    notes: string;
    treated_at: string;
  }) {
    if (!selectedTooth) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('tooth_records').insert({
      clinic_id: clinicId,
      patient_id: patientId,
      tooth_number: selectedTooth,
      treatment_type: form.treatment_type,
      surface: form.surface || null,
      notes: form.notes.trim() || null,
      treated_at: form.treated_at,
    });
    if (error) {
      toast.error('Failed to save tooth record.');
    } else {
      toast.success(`Tooth #${selectedTooth} — ${form.treatment_type} logged.`);
      load();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('tooth_records')
      .delete()
      .eq('id', deleteTarget.id);
    if (error) toast.error('Failed to delete record.');
    else { toast.success('Record deleted.'); load(); }
    setDeleting(false);
    setDeleteTarget(null);
  }

  const selectedToothRecords = selectedTooth
    ? records.filter(r => r.tooth_number === selectedTooth)
    : [];

  const treatedSet = new Set(records.map(r => r.tooth_number));

  return (
    <div className="space-y-4">

      {/* FIX: chart container measured for responsive scaling */}
      <div ref={containerRef}>
        <div
          ref={chartRef}
          className="bg-gray-50 rounded-2xl p-4 space-y-1 overflow-hidden"
        >
          <div className="flex items-center justify-between mb-1">
            <span style={{ fontSize: Math.max(8, 10 * chartScale) }} className="font-semibold text-gray-400 uppercase tracking-wider">
              Q1 · Upper Right
            </span>
            <span style={{ fontSize: Math.max(8, 10 * chartScale) }} className="font-semibold text-gray-400 uppercase tracking-wider">
              Q2 · Upper Left
            </span>
          </div>

          <div className="flex justify-between gap-0.5 px-1">
            {UPPER_TEETH.map(n => (
              <Tooth
                key={n} number={n} record={getLatestRecord(n)}
                selected={selectedTooth === n} onClick={() => handleToothClick(n)}
                isUpper scale={chartScale}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 py-1 px-1">
            <div className="flex-1 h-px bg-gray-200" />
            <span style={{ fontSize: Math.max(7, 9 * chartScale) }} className="text-gray-300 select-none">
              gum line
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="flex justify-between gap-0.5 px-1">
            {LOWER_TEETH.map(n => (
              <Tooth
                key={n} number={n} record={getLatestRecord(n)}
                selected={selectedTooth === n} onClick={() => handleToothClick(n)}
                isUpper={false} scale={chartScale}
              />
            ))}
          </div>

          <div className="flex items-center justify-between mt-1">
            <span style={{ fontSize: Math.max(8, 10 * chartScale) }} className="font-semibold text-gray-400 uppercase tracking-wider">
              Q4 · Lower Right
            </span>
            <span style={{ fontSize: Math.max(8, 10 * chartScale) }} className="font-semibold text-gray-400 uppercase tracking-wider">
              Q3 · Lower Left
            </span>
          </div>

          {records.length === 0 && !loading && (
            <p className="text-center text-xs text-gray-400 pt-2">
              Tap any tooth to begin charting
            </p>
          )}
        </div>
      </div>

      {/* Floating popover */}
      {selectedTooth !== null && (
        <ToothPopover
          toothNumber={selectedTooth}
          records={selectedToothRecords}
          onClose={() => setSelectedTooth(null)}
          onSave={handleSave}
          onDeleteRecord={rec => setDeleteTarget(rec)}
          saving={saving}
          anchorRef={chartRef}
        />
      )}

      {/* Teeth overview bar */}
      {records.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-600">Teeth Overview</p>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />
                Treated ({treatedSet.size})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-200 inline-block" />
                Untreated ({32 - treatedSet.size})
              </span>
            </div>
          </div>
          <div className="flex gap-0.5">
            {[...UPPER_TEETH, ...[...LOWER_TEETH].reverse()].map(n => {
              const rec = getLatestRecord(n);
              const cfg = rec ? TREATMENT_COLORS[rec.treatment_type] : null;
              return (
                <button
                  key={n}
                  onClick={() => handleToothClick(n)}
                  title={`#${n}${rec ? ` — ${rec.treatment_type}` : ''}`}
                  className="flex-1 rounded-sm transition-all hover:opacity-80"
                  style={{
                    height: 14,
                    backgroundColor: cfg ? cfg.bg : '#f1f5f9',
                    border: `1px solid ${cfg ? cfg.border : '#e2e8f0'}`,
                    boxShadow: selectedTooth === n ? `0 0 0 1.5px #0f766e` : undefined,
                  }}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[9px] text-gray-300">
            <span>#1</span>
            <span>Upper → Lower</span>
            <span>#32</span>
          </div>
        </div>
      )}

      {/* All records */}
      {records.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">All Records</p>
          </div>
          <div className="divide-y divide-gray-50">
            {[...records]
              .sort((a, b) => new Date(b.treated_at).getTime() - new Date(a.treated_at).getTime())
              .map(rec => {
                const cfg = TREATMENT_COLORS[rec.treatment_type];
                return (
                  <div
                    key={rec.id}
                    className="flex items-center gap-3 px-4 py-3 group hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ backgroundColor: cfg?.bg, color: cfg?.text, border: `1px solid ${cfg?.border}` }}
                    >
                      {rec.tooth_number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {rec.treatment_type}
                        {rec.surface && (
                          <span className="text-gray-400 font-normal"> · {rec.surface}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">{TOOTH_NAMES[rec.tooth_number]}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-400">{formatDateShort(rec.treated_at)}</p>
                      {rec.notes && (
                        <p className="text-xs text-gray-400 italic truncate max-w-[140px]">
                          {rec.notes}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setDeleteTarget(rec)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Tooth Record"
        message={deleteTarget
          ? `Remove ${deleteTarget.treatment_type} on Tooth #${deleteTarget.tooth_number} (${formatDateShort(deleteTarget.treated_at)})?`
          : ''}
        confirmLabel="Delete"
      />
    </div>
  );
}