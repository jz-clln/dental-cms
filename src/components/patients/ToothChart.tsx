'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { ConfirmModal } from '@/components/ui/Modal';
import { formatDateShort } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { X, Plus, Trash2, Info } from 'lucide-react';

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
  'Filling',
  'Extraction',
  'Root Canal',
  'Crown',
  'Bridge',
  'Implant',
  'Veneer',
  'Sealant',
  'Cleaning',
  'Whitening',
  'Braces',
  'Missing',
  'Decayed',
  'Fractured',
];

const SURFACES = ['Mesial', 'Distal', 'Occlusal', 'Buccal', 'Lingual', 'Incisal', 'Full'];

// Color per treatment type
const TREATMENT_COLORS: Record<string, { fill: string; text: string; legend: string }> = {
  'Filling':    { fill: '#3b82f6', text: 'white', legend: 'bg-blue-500' },
  'Extraction': { fill: '#ef4444', text: 'white', legend: 'bg-red-500' },
  'Root Canal': { fill: '#8b5cf6', text: 'white', legend: 'bg-violet-500' },
  'Crown':      { fill: '#f59e0b', text: 'white', legend: 'bg-amber-500' },
  'Bridge':     { fill: '#f97316', text: 'white', legend: 'bg-orange-500' },
  'Implant':    { fill: '#06b6d4', text: 'white', legend: 'bg-cyan-500' },
  'Veneer':     { fill: '#ec4899', text: 'white', legend: 'bg-pink-500' },
  'Sealant':    { fill: '#84cc16', text: 'white', legend: 'bg-lime-500' },
  'Cleaning':   { fill: '#14b8a6', text: 'white', legend: 'bg-teal-500' },
  'Whitening':  { fill: '#e2e8f0', text: '#334155', legend: 'bg-slate-200' },
  'Braces':     { fill: '#6366f1', text: 'white', legend: 'bg-indigo-500' },
  'Missing':    { fill: '#1e293b', text: 'white', legend: 'bg-slate-800' },
  'Decayed':    { fill: '#92400e', text: 'white', legend: 'bg-amber-900' },
  'Fractured':  { fill: '#dc2626', text: 'white', legend: 'bg-red-600' },
};

// Universal Numbering System (1-32)
// Upper row: 1-16 left to right (patient's right to left)
// Lower row: 17-32 left to right (patient's left to right)
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

// Molar = 1-3, 14-19, 30-32 | Premolar = 4-5, 12-13, 20-21, 28-29 | rest = anterior
function getToothShape(n: number): 'molar' | 'premolar' | 'anterior' {
  if ([1,2,3,14,15,16,17,18,19,30,31,32].includes(n)) return 'molar';
  if ([4,5,12,13,20,21,28,29].includes(n)) return 'premolar';
  return 'anterior';
}

// ─── Single tooth SVG ────────────────────────────────────────

interface ToothProps {
  number: number;
  records: ToothRecord[];
  selected: boolean;
  onClick: () => void;
}

function Tooth({ number, records, selected, onClick }: ToothProps) {
  const shape = getToothShape(number);
  const isUpper = number <= 16;
  const latestRecord = records[records.length - 1];
  const color = latestRecord
    ? (TREATMENT_COLORS[latestRecord.treatment_type]?.fill ?? '#94a3b8')
    : '#f1f5f9';
  const textColor = latestRecord
    ? (TREATMENT_COLORS[latestRecord.treatment_type]?.text ?? 'white')
    : '#64748b';
  const hasMultiple = records.length > 1;

  const w = shape === 'molar' ? 28 : shape === 'premolar' ? 22 : 18;
  const h = shape === 'molar' ? 32 : 28;

  // Crown shape path (simplified anatomical)
  function crownPath(w: number, h: number, isMolar: boolean) {
    if (isMolar) {
      return `M4,${h} Q2,${h} 2,${h-4} L2,6 Q2,2 6,2 L${w-6},2 Q${w-2},2 ${w-2},6 L${w-2},${h-4} Q${w-2},${h} ${w-4},${h} Z`;
    }
    return `M3,${h} Q2,${h} 2,${h-3} L2,5 Q2,2 5,2 L${w-5},2 Q${w-2},2 ${w-2},5 L${w-2},${h-3} Q${w-2},${h} ${w-3},${h} Z`;
  }

  // Root lines (drawn below crown for upper, above for lower)
  const rootCount = shape === 'molar' ? 3 : shape === 'premolar' ? 2 : 1;

  return (
    <g
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      className="group"
    >
      {/* Crown */}
      <rect
        x={1} y={1} width={w} height={h}
        rx={shape === 'anterior' ? 6 : 4}
        fill={color}
        stroke={selected ? '#0f766e' : records.length > 0 ? 'rgba(0,0,0,0.15)' : '#cbd5e1'}
        strokeWidth={selected ? 2.5 : 1.5}
        className="transition-all duration-150 group-hover:opacity-80"
        filter={selected ? 'drop-shadow(0 0 3px rgba(15,118,110,0.5))' : undefined}
      />

      {/* Root indicator lines */}
      {isUpper
        ? Array.from({ length: rootCount }).map((_, i) => (
          <line
            key={i}
            x1={(w / (rootCount + 1)) * (i + 1)}
            y1={h + 1}
            x2={(w / (rootCount + 1)) * (i + 1)}
            y2={h + 7}
            stroke={color === '#f1f5f9' ? '#cbd5e1' : color}
            strokeWidth={1.5}
            strokeLinecap="round"
            opacity={0.5}
          />
        ))
        : Array.from({ length: rootCount }).map((_, i) => (
          <line
            key={i}
            x1={(w / (rootCount + 1)) * (i + 1)}
            y1={0}
            x2={(w / (rootCount + 1)) * (i + 1)}
            y2={-6}
            stroke={color === '#f1f5f9' ? '#cbd5e1' : color}
            strokeWidth={1.5}
            strokeLinecap="round"
            opacity={0.5}
          />
        ))
      }

      {/* Tooth number */}
      <text
        x={w / 2}
        y={h / 2 + 4}
        textAnchor="middle"
        fontSize={shape === 'molar' ? 8 : 7}
        fontWeight={600}
        fill={textColor}
        style={{ userSelect: 'none', fontFamily: 'system-ui' }}
      >
        {number}
      </text>

      {/* Multiple records dot */}
      {hasMultiple && (
        <circle cx={w - 3} cy={3} r={3} fill="#f59e0b" stroke="white" strokeWidth={1} />
      )}
    </g>
  );
}

// ─── Main Chart Component ─────────────────────────────────────

export function ToothChart({ patientId, clinicId, toast }: ToothChartProps) {
  const [records, setRecords] = useState<ToothRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ToothRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeLegendFilter, setActiveLegendFilter] = useState<string | null>(null);

  const [form, setForm] = useState({
    treatment_type: 'Filling',
    surface: 'Full',
    notes: '',
    treated_at: new Date().toISOString().split('T')[0],
  });

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

  function getToothRecords(toothNumber: number): ToothRecord[] {
    return records.filter(r => r.tooth_number === toothNumber);
  }

  function handleToothClick(n: number) {
    setSelectedTooth(n);
    setShowLogPanel(true);
    setForm(f => ({ ...f, notes: '' }));
  }

  async function handleSave() {
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
      setForm(f => ({ ...f, notes: '' }));
      load();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from('tooth_records').delete().eq('id', deleteTarget.id);
    if (error) {
      toast.error('Failed to delete record.');
    } else {
      toast.success('Record deleted.');
      load();
    }
    setDeleting(false);
    setDeleteTarget(null);
  }

  // Treatments used on this patient
  const usedTreatments = [...new Set(records.map(r => r.treatment_type))];

  // Filter records by legend
  const visibleRecords = activeLegendFilter
    ? records.filter(r => r.treatment_type === activeLegendFilter)
    : records;

  const selectedToothRecords = selectedTooth
    ? records.filter(r => r.tooth_number === selectedTooth)
    : [];

  // Calculate spacing for teeth rows
  const GAP = 4;
  function rowWidth(teeth: number[]) {
    return teeth.reduce((sum, n) => {
      const s = getToothShape(n);
      return sum + (s === 'molar' ? 30 : s === 'premolar' ? 24 : 20) + GAP;
    }, -GAP);
  }

  function toothX(teeth: number[], index: number) {
    let x = 0;
    for (let i = 0; i < index; i++) {
      const s = getToothShape(teeth[i]);
      x += (s === 'molar' ? 30 : s === 'premolar' ? 24 : 20) + GAP;
    }
    return x;
  }

  const upperWidth = rowWidth(UPPER_TEETH);
  const lowerWidth = rowWidth(LOWER_TEETH);
  const svgWidth = Math.max(upperWidth, lowerWidth) + 2;
  const SVG_H = 130; // upper row + gap + lower row

  return (
    <div className="space-y-5">

      {/* Legend */}
      {usedTreatments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {usedTreatments.map(t => {
            const cfg = TREATMENT_COLORS[t];
            const isActive = activeLegendFilter === t;
            return (
              <button
                key={t}
                onClick={() => setActiveLegendFilter(isActive ? null : t)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                  isActive
                    ? 'border-transparent shadow-sm scale-105'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
                style={isActive ? { backgroundColor: cfg?.fill, color: cfg?.text, borderColor: cfg?.fill } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cfg?.fill ?? '#94a3b8' }}
                />
                {t}
              </button>
            );
          })}
          {activeLegendFilter && (
            <button
              onClick={() => setActiveLegendFilter(null)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-gray-400 border border-gray-200 hover:border-gray-300 bg-white"
            >
              <X className="w-3 h-3" /> Clear filter
            </button>
          )}
        </div>
      )}

      {/* SVG Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 overflow-x-auto">
        {/* Labels */}
        <div className="flex justify-between text-xs text-gray-400 font-medium mb-1 px-1">
          <span>Patient's Right</span>
          <span>Upper Jaw</span>
          <span>Patient's Left</span>
        </div>

        <svg
          viewBox={`0 0 ${svgWidth} ${SVG_H}`}
          width="100%"
          style={{ minWidth: 480, maxWidth: 640, display: 'block', margin: '0 auto' }}
        >
          {/* UPPER row */}
          <g transform="translate(0, 8)">
            {UPPER_TEETH.map((n, i) => {
              const x = toothX(UPPER_TEETH, i);
              const shape = getToothShape(n);
              const w = shape === 'molar' ? 28 : shape === 'premolar' ? 22 : 18;
              const h = shape === 'molar' ? 32 : 28;
              const toothRecs = activeLegendFilter
                ? records.filter(r => r.tooth_number === n && r.treatment_type === activeLegendFilter)
                : records.filter(r => r.tooth_number === n);
              return (
                <g key={n} transform={`translate(${x}, 0)`}>
                  <Tooth
                    number={n}
                    records={toothRecs}
                    selected={selectedTooth === n}
                    onClick={() => handleToothClick(n)}
                  />
                </g>
              );
            })}
          </g>

          {/* Center line — gum line */}
          <line
            x1={0} y1={SVG_H / 2}
            x2={svgWidth} y2={SVG_H / 2}
            stroke="#e2e8f0" strokeWidth={1.5} strokeDasharray="4 3"
          />
          <text x={svgWidth / 2} y={SVG_H / 2 - 3} textAnchor="middle"
            fontSize={8} fill="#94a3b8" style={{ userSelect: 'none' }}>
            gum line
          </text>

          {/* LOWER row */}
          <g transform={`translate(0, ${SVG_H - 8})`}>
            {LOWER_TEETH.map((n, i) => {
              const x = toothX(LOWER_TEETH, i);
              const shape = getToothShape(n);
              const w = shape === 'molar' ? 28 : shape === 'premolar' ? 22 : 18;
              const h = shape === 'molar' ? 32 : 28;
              const toothRecs = activeLegendFilter
                ? records.filter(r => r.tooth_number === n && r.treatment_type === activeLegendFilter)
                : records.filter(r => r.tooth_number === n);
              return (
                <g key={n} transform={`translate(${x}, ${-(h + 8)})`}>
                  <Tooth
                    number={n}
                    records={toothRecs}
                    selected={selectedTooth === n}
                    onClick={() => handleToothClick(n)}
                  />
                </g>
              );
            })}
          </g>
        </svg>

        <div className="flex justify-between text-xs text-gray-400 font-medium mt-1 px-1">
          <span>Patient's Right</span>
          <span>Lower Jaw</span>
          <span>Patient's Left</span>
        </div>

        <p className="text-center text-xs text-gray-400 mt-3">
          Tap any tooth to log treatment · Yellow dot = multiple records
        </p>
      </div>

      {/* Log panel — appears when tooth is selected */}
      {showLogPanel && selectedTooth && (
        <div className="bg-white rounded-2xl border border-teal-200 shadow-sm overflow-hidden">

          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-4 bg-teal-50 border-b border-teal-100">
            <div>
              <p className="font-semibold text-teal-900">
                Tooth #{selectedTooth}
              </p>
              <p className="text-xs text-teal-600 mt-0.5">{TOOTH_NAMES[selectedTooth]}</p>
            </div>
            <button
              onClick={() => { setShowLogPanel(false); setSelectedTooth(null); }}
              className="p-1.5 rounded-lg text-teal-400 hover:bg-teal-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-5">

            {/* Existing records for this tooth */}
            {selectedToothRecords.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Treatment History for Tooth #{selectedTooth}
                </p>
                <div className="space-y-2">
                  {selectedToothRecords.map(rec => {
                    const cfg = TREATMENT_COLORS[rec.treatment_type];
                    return (
                      <div key={rec.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 group"
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cfg?.fill ?? '#94a3b8' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{rec.treatment_type}</p>
                          <p className="text-xs text-gray-500">
                            {rec.surface && `${rec.surface} · `}
                            {formatDateShort(rec.treated_at)}
                          </p>
                          {rec.notes && (
                            <p className="text-xs text-gray-400 mt-0.5 italic">{rec.notes}</p>
                          )}
                        </div>
                        <button
                          onClick={() => setDeleteTarget(rec)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300
                            hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add new record form */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Log New Treatment
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Treatment"
                    value={form.treatment_type}
                    onChange={e => setForm(f => ({ ...f, treatment_type: e.target.value }))}
                  >
                    {TREATMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </Select>
                  <Select
                    label="Surface"
                    value={form.surface}
                    onChange={e => setForm(f => ({ ...f, surface: e.target.value }))}
                  >
                    {SURFACES.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </div>
                <Input
                  label="Date of Treatment"
                  type="date"
                  value={form.treated_at}
                  onChange={e => setForm(f => ({ ...f, treated_at: e.target.value }))}
                />
                <Textarea
                  label="Notes (optional)"
                  placeholder="Additional details about the procedure…"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                />
                <Button onClick={handleSave} loading={saving} size="sm">
                  <Plus className="w-4 h-4" /> Log Treatment
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary stats */}
      {records.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{records.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total Records</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {new Set(records.map(r => r.tooth_number)).size}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Teeth Treated</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-2xl font-bold text-teal-700">
              {32 - new Set(records.map(r => r.tooth_number)).size}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Untreated</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {records.filter(r => r.treatment_type === 'Decayed' || r.treatment_type === 'Fractured').length}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Needs Attention</p>
          </div>
        </div>
      )}

      {/* All records table */}
      {records.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold text-gray-700">All Tooth Records</p>
          </div>
          <div className="divide-y divide-gray-50">
            {[...records]
              .sort((a, b) => new Date(b.treated_at).getTime() - new Date(a.treated_at).getTime())
              .map(rec => {
                const cfg = TREATMENT_COLORS[rec.treatment_type];
                return (
                  <div key={rec.id} className="flex items-center gap-3 px-5 py-3 group hover:bg-gray-50 transition-colors">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ backgroundColor: cfg?.fill ?? '#f1f5f9', color: cfg?.text ?? '#64748b' }}
                    >
                      {rec.tooth_number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {rec.treatment_type}
                        {rec.surface && <span className="text-gray-400 font-normal"> · {rec.surface}</span>}
                      </p>
                      <p className="text-xs text-gray-400">{TOOTH_NAMES[rec.tooth_number]}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500">{formatDateShort(rec.treated_at)}</p>
                      {rec.notes && (
                        <p className="text-xs text-gray-400 italic truncate max-w-[140px]">{rec.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setDeleteTarget(rec)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300
                        hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Delete confirm */}
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
