'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { KeyboardEvent, RefObject } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/Modal';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { formatDateShort } from '@/lib/utils';
import { X, Plus, Trash2, SlidersHorizontal } from 'lucide-react';

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

// ─── Design tokens ───────────────────────────────────────────
// Base neutral   slate  (bg-slate-50 / border-slate-100 / text-slate-400–700)
// Accent         teal-700  #0f766e   — selection, focus rings, primary actions
// Elevation      flat cards use borders + shadow-sm; the popover alone gets a
//                deliberately heavier shadow so it reads as "floating above"
// Treatment hues are categorical — defined in TREATMENT_COLORS below

const PRIMARY = '#0f766e';   // teal-700
const PRIMARY_SOFT = '#14b8a6'; // teal-500

// ─── Constants ───────────────────────────────────────────────

const TREATMENT_TYPES = [
  'Filling','Extraction','Root Canal','Crown','Bridge','Implant',
  'Veneer','Sealant','Cleaning','Whitening','Braces','Missing','Decayed','Fractured',
];

const SURFACES = ['Mesial','Distal','Occlusal','Buccal','Lingual','Incisal','Full'];

const TREATMENT_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  'Filling':    { bg: '#E7EEFB', border: '#B9CBF0', text: '#2A4A8C', dot: '#3E63B3' },
  'Extraction': { bg: '#FBEAEA', border: '#EFC2C2', text: '#8C2F2F', dot: '#B54B4B' },
  'Root Canal': { bg: '#EFE9FA', border: '#D2C3EF', text: '#5B3B94', dot: '#7C57B8' },
  'Crown':      { bg: '#FBF1DC', border: '#ECD49C', text: '#8A5D14', dot: '#B98423' },
  'Bridge':     { bg: '#FBEEE3', border: '#EFCBAE', text: '#8A4A1F', dot: '#BC6A34' },
  'Implant':    { bg: '#E4F3F4', border: '#B7DEE0', text: '#1F6367', dot: '#2E8F94' },
  'Veneer':     { bg: '#FBEAF1', border: '#EFC1D7', text: '#8C2F5C', dot: '#B84E80' },
  'Sealant':    { bg: '#EDF5E4', border: '#C9E2AE', text: '#4B6B28', dot: '#729E45' },
  'Cleaning':   { bg: '#E3F2EE', border: '#B4DED2', text: '#1F6B57', dot: '#2F9478' },
  'Whitening':  { bg: '#F5F6F7', border: '#DDE1E5', text: '#4A5560', dot: '#7C8894' },
  'Braces':     { bg: '#EAECFA', border: '#C6CBF0', text: '#3A3F8C', dot: '#5559B3' },
  'Missing':    { bg: '#EEF0F2', border: '#B9C1C9', text: '#4A5560', dot: '#7C8894' },
  'Decayed':    { bg: '#FBEBDE', border: '#EFC79E', text: '#8A4212', dot: '#B85B1E' },
  'Fractured':  { bg: '#FBE7E5', border: '#F0B8B3', text: '#922F1F', dot: '#C24A34' },
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

// Crown/root radii per shape — the rounder "crown" edge always faces the gum
// line (the arch midline), the flatter "root" edge faces the number label.
const SHAPE_RADIUS: Record<'molar' | 'premolar' | 'anterior', { crown: number; root: number }> = {
  anterior: { crown: 11, root: 4 },
  premolar: { crown: 9,  root: 4 },
  molar:    { crown: 7,  root: 3 },
};

// ─── Shared hook ─────────────────────────────────────────────

function useIsMobile(breakpointPx: number) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [breakpointPx]);
  return isMobile;
}

// ─── Single Tooth ────────────────────────────────────────────

interface ToothProps {
  number: number;
  record: ToothRecord | null;
  selected: boolean;
  dimmed: boolean;
  onClick: () => void;
  isUpper: boolean;
  scale: number;
  registerRef: (n: number, el: HTMLButtonElement | null) => void;
  onKeyNav: (e: KeyboardEvent<HTMLButtonElement>, n: number) => void;
}

function Tooth({ number, record, selected, dimmed, onClick, isUpper, scale, registerRef, onKeyNav }: ToothProps) {
  const [hovered, setHovered] = useState(false);
  const shape = getToothShape(number);
  const cfg = record ? TREATMENT_COLORS[record.treatment_type] : null;
  const isMissing = record?.treatment_type === 'Missing';

  const baseW = shape === 'molar' ? 32 : shape === 'premolar' ? 26 : 20;
  const baseH = shape === 'molar' ? 34 : shape === 'premolar' ? 30 : 26;
  const w = Math.floor(baseW * scale);
  const h = Math.floor(baseH * scale);

  const { crown, root } = SHAPE_RADIUS[shape];
  const crownPx = Math.max(3, Math.round(crown * scale));
  const rootPx = Math.max(2, Math.round(root * scale));
  const radius = isUpper
    ? `${rootPx}px ${rootPx}px ${crownPx}px ${crownPx}px`
    : `${crownPx}px ${crownPx}px ${rootPx}px ${rootPx}px`;

  const bg = cfg ? cfg.bg : '#F3F6F8';
  const border = selected ? PRIMARY : cfg ? cfg.border : '#CBD5DD';

  const shadow = selected
    ? `0 0 0 2px ${PRIMARY}, 0 3px 10px rgba(15,118,110,0.25)`
    : hovered
      ? '0 2px 6px rgba(15,23,42,0.12)'
      : '0 1px 2px rgba(15,23,42,0.06)';

  return (
    <div
      className="flex flex-col items-center gap-0.5"
      style={{ width: w, opacity: dimmed ? 0.32 : 1, transition: 'opacity 0.2s ease' }}
    >
      {isUpper && (
        <span style={{ fontSize: Math.max(7, 8 * scale) }} className="tabular-nums leading-none text-slate-400 select-none">
          {number}
        </span>
      )}
      <button
        ref={el => registerRef(number, el)}
        type="button"
        onClick={onClick}
        onKeyDown={e => onKeyNav(e, number)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={`Tooth ${number}, ${TOOTH_NAMES[number]}${record ? `, ${record.treatment_type}` : ', no treatment recorded'}`}
        aria-pressed={selected}
        title={`#${number} ${TOOTH_NAMES[number]}${record ? ` — ${record.treatment_type}` : ''}`}
        style={{
          width: w,
          height: h,
          backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0) 65%), linear-gradient(${bg}, ${bg})`,
          border: `1.5px ${isMissing ? 'dashed' : 'solid'} ${border}`,
          borderRadius: radius,
          boxShadow: shadow,
          transform: selected ? 'scale(1.06)' : hovered ? 'scale(1.02)' : 'scale(1)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
        }}
        className="relative flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-600"
      >
        {record && !isMissing && (
          <div
            style={{
              width: Math.max(4, 6 * scale),
              height: Math.max(4, 6 * scale),
              borderRadius: '50%',
              backgroundColor: cfg?.dot ?? '#94a3b8',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.9)',
            }}
          />
        )}
      </button>
      {!isUpper && (
        <span style={{ fontSize: Math.max(7, 8 * scale) }} className="tabular-nums leading-none text-slate-400 select-none">
          {number}
        </span>
      )}
    </div>
  );
}

// ─── Quadrant label ──────────────────────────────────────────

function QuadrantLabel({ quadrant, name, align, scale }: { quadrant: number; name: string; align: 'left' | 'right'; scale: number }) {
  return (
    <div className={`flex items-center gap-1.5 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      <span
        className="flex items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-500"
        style={{ width: 16, height: 16, fontSize: 9 }}
      >
        {quadrant}
      </span>
      <span style={{ fontSize: Math.max(9, 10.5 * scale) }} className="font-medium text-slate-400">
        {name}
      </span>
    </div>
  );
}

// ─── Legend ──────────────────────────────────────────────────

function Legend({
  presentTypes, activeFilter, onFilterChange,
}: {
  presentTypes: string[];
  activeFilter: string | null;
  onFilterChange: (t: string | null) => void;
}) {
  if (presentTypes.length === 0) {
    return (
      <p className="text-xs leading-relaxed text-slate-400">
        Log a treatment on any tooth and its category will appear here for quick filtering.
      </p>
    );
  }

  return (
    <div className="space-y-0.5">
      {presentTypes.map(type => {
        const cfg = TREATMENT_COLORS[type];
        const active = activeFilter === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onFilterChange(active ? null : type)}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors hover:bg-slate-50"
            style={{
              backgroundColor: active ? cfg.bg : undefined,
              color: active ? cfg.text : '#475569',
              boxShadow: active ? `inset 0 0 0 1px ${cfg.border}` : undefined,
            }}
          >
            <span
              className="h-2 w-2 flex-shrink-0 rounded-full"
              style={{
                backgroundColor: type === 'Missing' ? 'transparent' : cfg.dot,
                border: type === 'Missing' ? `1.5px dashed ${cfg.dot}` : 'none',
              }}
            />
            {type}
          </button>
        );
      })}
      {activeFilter && (
        <button
          type="button"
          onClick={() => onFilterChange(null)}
          className="pl-2.5 pt-1.5 text-[11px] font-medium text-teal-700 hover:text-teal-800"
        >
          Clear filter
        </button>
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
  contentRef?: RefObject<HTMLDivElement>;
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
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Tooth #{toothNumber}</p>
          <p className="text-[11px] leading-tight text-slate-400">{TOOTH_NAMES[toothNumber]}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-4 p-5">
        {/* Existing records */}
        {records.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {records.map(rec => {
              const cfg = TREATMENT_COLORS[rec.treatment_type];
              return (
                <div
                  key={rec.id}
                  className="group flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ backgroundColor: cfg?.bg, border: `1px solid ${cfg?.border}`, color: cfg?.text }}
                >
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: cfg?.dot }} />
                  {rec.treatment_type}
                  <span className="opacity-60">{formatDateShort(rec.treated_at)}</span>
                  <button
                    onClick={() => onDeleteRecord(rec)}
                    aria-label={`Delete ${rec.treatment_type} record`}
                    className="ml-0.5 opacity-0 transition-all hover:text-red-500 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
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

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-slate-500">Date</label>
            <input
              type="date"
              value={form.treated_at}
              onChange={e => setForm(f => ({ ...f, treated_at: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
          <Button
            onClick={() => onSave(form).then(() => setForm(f => ({ ...f, notes: '' })))}
            loading={saving}
            size="sm"
          >
            <Plus className="h-3.5 w-3.5" /> Log
          </Button>
        </div>

        <textarea
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          rows={2}
          className="w-full resize-none rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
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
  anchorEl: HTMLButtonElement | null;
}

function ToothPopover(props: PopoverProps) {
  const { onClose, anchorEl } = props;
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; placement: 'above' | 'below'; caretLeft: number } | null>(null);
  const isMobile = useIsMobile(640);

  useEffect(() => {
    if (isMobile || !anchorEl || !popoverRef.current) return;

    const anchor = anchorEl.getBoundingClientRect();
    const popover = popoverRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;

    let left = anchor.left + anchor.width / 2 - popover.width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - popover.width - 8));

    let top = anchor.bottom + scrollY + 10;
    let placement: 'above' | 'below' = 'below';
    if (anchor.bottom + popover.height + 10 > window.innerHeight) {
      top = anchor.top + scrollY - popover.height - 10;
      placement = 'above';
    }

    const anchorCenterX = anchor.left + anchor.width / 2;
    const caretLeft = Math.max(16, Math.min(anchorCenterX - left, popover.width - 16));

    setPosition({ top, left, placement, caretLeft });
  }, [props.toothNumber, anchorEl, isMobile]);

  // Outside click to close
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorEl &&
        !anchorEl.contains(e.target as Node)
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
  }, [onClose, anchorEl]);

  // Escape to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent | globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey as (e: globalThis.KeyboardEvent) => void);
    return () => document.removeEventListener('keydown', handleKey as (e: globalThis.KeyboardEvent) => void);
  }, [onClose]);

  // ── Mobile: bottom sheet ───────────────────────────────────
  if (isMobile) {
    return (
      <>
        <style jsx global>{`
          @keyframes toothSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes toothBackdropIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
        <div
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[2px] motion-safe:animate-[toothBackdropIn_0.2s_ease-out]"
          onMouseDown={onClose}
        />
        <div
          className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.15)] motion-safe:animate-[toothSheetUp_0.25s_ease-out]"
        >
          <div className="flex justify-center pt-2.5 pb-1">
            <div className="h-1 w-8 rounded-full bg-slate-200" />
          </div>
          <PopoverContent {...props} />
        </div>
      </>
    );
  }

  // ── Desktop: floating popover with caret ───────────────────
  return (
    <div
      ref={popoverRef}
      className="fixed z-50 rounded-2xl border border-slate-100 bg-white shadow-[0_20px_50px_-12px_rgba(15,23,42,0.28)]"
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        width: 340,
        visibility: position ? 'visible' : 'hidden',
        opacity: position ? 1 : 0,
        transition: 'opacity 0.15s ease',
      }}
    >
      {position && (
        <div
          className="absolute h-3 w-3 rotate-45 bg-white"
          style={{
            left: position.caretLeft - 6,
            top: position.placement === 'below' ? -6 : undefined,
            bottom: position.placement === 'above' ? -6 : undefined,
            borderTop: position.placement === 'below' ? '1px solid #f1f5f9' : 'none',
            borderLeft: position.placement === 'below' ? '1px solid #f1f5f9' : 'none',
            borderBottom: position.placement === 'above' ? '1px solid #f1f5f9' : 'none',
            borderRight: position.placement === 'above' ? '1px solid #f1f5f9' : 'none',
          }}
        />
      )}
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
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);

  const toothRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const registerToothRef = useCallback((n: number, el: HTMLButtonElement | null) => {
    toothRefs.current[n] = el;
  }, []);

  // Measure container width and derive scale so the chart always fits.
  const [chartScale, setChartScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function measure() {
      if (!containerRef.current) return;
      const containerW = containerRef.current.offsetWidth - 32; // subtract padding
      const FULL_WIDTH = 560; // full-size chart needs ~560px (16 teeth × avg 35px)
      setChartScale(Math.min(1, containerW / FULL_WIDTH));
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

  // Most recent record per tooth (records arrive sorted ascending by date).
  const latestByTooth = useMemo(() => {
    const map = new Map<number, ToothRecord>();
    for (const r of records) map.set(r.tooth_number, r);
    return map;
  }, [records]);

  const getLatestRecord = useCallback((n: number) => latestByTooth.get(n) ?? null, [latestByTooth]);

  const presentTypes = useMemo(
    () => TREATMENT_TYPES.filter(t => records.some(r => r.treatment_type === t)),
    [records]
  );

  function handleToothClick(n: number) {
    setSelectedTooth(prev => (prev === n ? null : n));
  }

  function handleKeyNav(e: KeyboardEvent<HTMLButtonElement>, current: number) {
    const upperIdx = UPPER_TEETH.indexOf(current);
    const lowerIdx = LOWER_TEETH.indexOf(current);
    let next: number | null = null;

    if (e.key === 'ArrowRight') {
      if (upperIdx !== -1) next = UPPER_TEETH[Math.min(upperIdx + 1, UPPER_TEETH.length - 1)];
      else if (lowerIdx !== -1) next = LOWER_TEETH[Math.min(lowerIdx + 1, LOWER_TEETH.length - 1)];
    } else if (e.key === 'ArrowLeft') {
      if (upperIdx !== -1) next = UPPER_TEETH[Math.max(upperIdx - 1, 0)];
      else if (lowerIdx !== -1) next = LOWER_TEETH[Math.max(lowerIdx - 1, 0)];
    } else if (e.key === 'ArrowDown' && upperIdx !== -1) {
      next = LOWER_TEETH[upperIdx];
    } else if (e.key === 'ArrowUp' && lowerIdx !== -1) {
      next = UPPER_TEETH[lowerIdx];
    } else if (e.key === 'Escape') {
      setSelectedTooth(null);
      return;
    } else {
      return;
    }

    if (next !== null) {
      e.preventDefault();
      setSelectedTooth(next);
      toothRefs.current[next]?.focus();
    }
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

  const filteredRecords = [...records]
    .filter(r => !activeFilter || r.treatment_type === activeFilter)
    .sort((a, b) => new Date(b.treated_at).getTime() - new Date(a.treated_at).getTime());

  const legendPanel = (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-700">Progress</p>
          <p className="text-xs text-slate-400">{treatedSet.size}/32</p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(treatedSet.size / 32) * 100}%`, backgroundColor: PRIMARY }}
          />
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold text-slate-700">Legend</p>
        <Legend presentTypes={presentTypes} activeFilter={activeFilter} onFilterChange={setActiveFilter} />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="lg:grid lg:grid-cols-[1fr_280px] lg:items-start lg:gap-5">
        <div className="min-w-0 space-y-4">

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <p className="text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{treatedSet.size}</span> of 32 teeth treated
              </p>
              {activeFilter && (
                <span className="hidden items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700 sm:inline-flex">
                  {activeFilter}
                  <button onClick={() => setActiveFilter(null)} aria-label="Clear filter" className="hover:text-teal-900">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
            <button
              onClick={() => setLegendOpen(o => !o)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:text-slate-900 lg:hidden"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Legend
            </button>
          </div>

          {/* Mobile legend drawer */}
          {legendOpen && (
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm lg:hidden">
              {legendPanel}
            </div>
          )}

          {/* Chart */}
          <div ref={containerRef}>
            <div
              className={`space-y-1 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-opacity ${loading ? 'animate-pulse opacity-60' : ''}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <QuadrantLabel quadrant={1} name="Upper right" align="left" scale={chartScale} />
                <QuadrantLabel quadrant={2} name="Upper left" align="right" scale={chartScale} />
              </div>

              <div className="flex justify-between gap-0.5 px-1">
                {UPPER_TEETH.map(n => {
                  const record = getLatestRecord(n);
                  return (
                    <Tooth
                      key={n} number={n} record={record}
                      selected={selectedTooth === n}
                      dimmed={!!activeFilter && record?.treatment_type !== activeFilter}
                      onClick={() => handleToothClick(n)}
                      isUpper scale={chartScale}
                      registerRef={registerToothRef}
                      onKeyNav={handleKeyNav}
                    />
                  );
                })}
              </div>

              <div className="flex items-center gap-2 px-1 py-1">
                <div className="h-px flex-1 bg-slate-200" />
                <span style={{ fontSize: Math.max(7, 9 * chartScale) }} className="select-none text-slate-300">
                  gum line
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="flex justify-between gap-0.5 px-1">
                {LOWER_TEETH.map(n => {
                  const record = getLatestRecord(n);
                  return (
                    <Tooth
                      key={n} number={n} record={record}
                      selected={selectedTooth === n}
                      dimmed={!!activeFilter && record?.treatment_type !== activeFilter}
                      onClick={() => handleToothClick(n)}
                      isUpper={false} scale={chartScale}
                      registerRef={registerToothRef}
                      onKeyNav={handleKeyNav}
                    />
                  );
                })}
              </div>

              <div className="mt-1 flex items-center justify-between">
                <QuadrantLabel quadrant={4} name="Lower right" align="left" scale={chartScale} />
                <QuadrantLabel quadrant={3} name="Lower left" align="right" scale={chartScale} />
              </div>

              {records.length === 0 && !loading && (
                <p className="pt-2 text-center text-xs text-slate-400">
                  Tap any tooth to begin charting
                </p>
              )}
            </div>
          </div>

          {/* Teeth overview bar */}
          {records.length > 0 && (
            <div className="space-y-2 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-600">Teeth overview</p>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: PRIMARY_SOFT }} />
                    Treated ({treatedSet.size})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-slate-200" />
                    Untreated ({32 - treatedSet.size})
                  </span>
                </div>
              </div>
              <div className="flex gap-0.5">
                {[...UPPER_TEETH, ...[...LOWER_TEETH].reverse()].map((n, idx) => {
                  const rec = getLatestRecord(n);
                  const cfg = rec ? TREATMENT_COLORS[rec.treatment_type] : null;
                  const roundedClass =
                    idx === 0 ? 'rounded-l-sm' : idx === 15 ? 'rounded-r-sm' :
                    idx === 16 ? 'rounded-l-sm' : idx === 31 ? 'rounded-r-sm' : '';
                  return (
                    <button
                      key={n}
                      onClick={() => handleToothClick(n)}
                      title={`#${n}${rec ? ` — ${rec.treatment_type}` : ''}`}
                      className={`flex-1 transition-all hover:opacity-80 ${roundedClass}`}
                      style={{
                        height: 14,
                        marginLeft: idx === 16 ? 8 : 0,
                        backgroundColor: cfg ? cfg.bg : '#f1f5f9',
                        border: `1px solid ${cfg ? cfg.border : '#e2e8f0'}`,
                        boxShadow: selectedTooth === n ? `0 0 0 1.5px ${PRIMARY}` : undefined,
                        opacity: activeFilter && rec?.treatment_type !== activeFilter ? 0.35 : 1,
                      }}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-[9px] text-slate-300">
                <span>#1</span>
                <span>Upper → Lower</span>
                <span>#32</span>
              </div>
            </div>
          )}

          {/* All records */}
          {records.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-700">All records</p>
                {activeFilter && (
                  <button
                    onClick={() => setActiveFilter(null)}
                    className="text-xs font-medium text-teal-700 hover:text-teal-800"
                  >
                    Clear filter
                  </button>
                )}
              </div>
              {filteredRecords.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-slate-400">
                  No {activeFilter} records yet.
                </p>
              ) : (
                <div className="divide-y divide-slate-50">
                  {filteredRecords.map(rec => {
                    const cfg = TREATMENT_COLORS[rec.treatment_type];
                    return (
                      <div
                        key={rec.id}
                        className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                      >
                        <div
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                          style={{ backgroundColor: cfg?.bg, color: cfg?.text, border: `1px solid ${cfg?.border}` }}
                        >
                          {rec.tooth_number}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900">
                            {rec.treatment_type}
                            {rec.surface && (
                              <span className="font-normal text-slate-400"> · {rec.surface}</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400">{TOOTH_NAMES[rec.tooth_number]}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-slate-400">{formatDateShort(rec.treated_at)}</p>
                          {rec.notes && (
                            <p className="max-w-[140px] truncate text-xs italic text-slate-400">
                              {rec.notes}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => setDeleteTarget(rec)}
                          aria-label={`Delete ${rec.treatment_type} on tooth ${rec.tooth_number}`}
                          className="flex-shrink-0 rounded-lg p-1.5 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden h-fit rounded-2xl border border-slate-100 bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:block">
          {legendPanel}
        </aside>
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
          anchorEl={toothRefs.current[selectedTooth] ?? null}
        />
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