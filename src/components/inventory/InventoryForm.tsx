'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { InventoryItem, InventoryFormData } from '@/types';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { UnsavedChangesModal } from '@/components/ui/UnsavedChangesModal';
import { INVENTORY_CATEGORIES, getTodayString } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Plus, Minus, Package, AlertTriangle } from 'lucide-react';

/* ─── ADD / EDIT ITEM FORM ─────────────────────────────────── */

interface AddItemFormProps {
  clinicId: string;
  existing?: InventoryItem;
  onSuccess: () => void;
  onCancel: () => void;
  toast: { success: (m: string) => void; error: (m: string) => void };
}

interface AddErrors {
  item_name?: string;
  category?: string;
  quantity?: string;
  unit?: string;
  reorder_level?: string;
}

export function AddItemForm({ clinicId, existing, onSuccess, onCancel, toast }: AddItemFormProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<AddErrors>({});

  const [form, setForm] = useState<InventoryFormData>({
    item_name: existing?.item_name ?? '',
    category: existing?.category ?? '',
    quantity: existing?.quantity ?? 0,
    unit: existing?.unit ?? 'pcs',
    reorder_level: existing?.reorder_level ?? 10,
    last_restocked: existing?.last_restocked ?? getTodayString(),
  });

  const isDirty = !submitted && (!!form.item_name || !!form.category || form.quantity > 0);

  function set<K extends keyof InventoryFormData>(field: K, value: InventoryFormData[K]) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof AddErrors]) setErrors(prev => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const e: AddErrors = {};
    if (!form.item_name.trim()) e.item_name = 'Item name is required.';
    if (!form.category) e.category = 'Please select a category.';
    if (form.quantity < 0) e.quantity = 'Quantity cannot be negative.';
    if (!form.unit.trim()) e.unit = 'Unit is required.';
    if (form.reorder_level < 0) e.reorder_level = 'Reorder level cannot be negative.';
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
      item_name: form.item_name.trim(),
      category: form.category,
      quantity: Number(form.quantity),
      unit: form.unit.trim(),
      reorder_level: Number(form.reorder_level),
      last_restocked: form.last_restocked || null,
    };

    if (existing) {
      const { error } = await supabase.from('inventory_items').update(payload).eq('id', existing.id);
      if (error) { toast.error('Failed to update item.'); setLoading(false); return; }
      toast.success('Item updated successfully.');
    } else {
      const { error } = await supabase.from('inventory_items').insert(payload);
      if (error) { toast.error('Failed to add item.'); setLoading(false); return; }
      toast.success(`"${form.item_name}" added to inventory.`);
    }

    setSubmitted(true);
    setLoading(false);
    onSuccess();
  }

  function handleCancel() {
    if (isDirty) setShowConfirm(true);
    else onCancel();
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Item name */}
        <Input
          label="Item Name"
          placeholder="e.g. Dental Gloves (Medium)"
          value={form.item_name}
          onChange={e => set('item_name', e.target.value)}
          error={errors.item_name}
          required
        />

        {/* Category + Unit */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Category"
            value={form.category}
            onChange={e => set('category', e.target.value)}
            error={errors.category}
            placeholder="Select category…"
          >
            {INVENTORY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input
            label="Unit"
            placeholder="pcs, box, bottle…"
            value={form.unit}
            onChange={e => set('unit', e.target.value)}
            error={errors.unit}
          />
        </div>

        {/* Quantity + Reorder level */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Current Quantity"
            type="number"
            min={0}
            value={form.quantity}
            onChange={e => set('quantity', Number(e.target.value))}
            error={errors.quantity}
          />
          <Input
            label="Reorder Level"
            type="number"
            min={0}
            value={form.reorder_level}
            onChange={e => set('reorder_level', Number(e.target.value))}
            error={errors.reorder_level}
            hint="Alert when stock falls below this"
          />
        </div>

        {/* Last restocked */}
        <Input
          label="Last Restocked"
          type="date"
          value={form.last_restocked}
          onChange={e => set('last_restocked', e.target.value)}
        />

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button type="submit" loading={loading} className="flex-1 sm:flex-none">
            {existing ? 'Save Changes' : 'Add Item'}
          </Button>
          <Button type="button" variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </form>

      <UnsavedChangesModal
        open={showConfirm}
        onStay={() => setShowConfirm(false)}
        onLeave={() => { setShowConfirm(false); onCancel(); }}
      />
    </>
  );
}

/* ─── RESTOCK FORM ─────────────────────────────────────────── */

interface RestockFormProps {
  item: InventoryItem;
  onSuccess: () => void;
  onCancel: () => void;
  toast: { success: (m: string) => void; error: (m: string) => void };
}

export function RestockForm({ item, onSuccess, onCancel, toast }: RestockFormProps) {
  const [mode, setMode] = useState<'add' | 'deduct'>('add');
  const [qty, setQty] = useState(0);
  const [date, setDate] = useState(getTodayString());
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  const isDirty = !submitted && qty > 0;
  const isLow = item.quantity <= item.reorder_level;
  const newTotal = mode === 'add'
    ? item.quantity + Number(qty)
    : item.quantity - Number(qty);
  const newIsLow = qty > 0 && !error && newTotal <= item.reorder_level;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (qty <= 0) { setError('Enter a quantity greater than 0.'); return; }
    if (mode === 'deduct' && qty > item.quantity) {
      setError(`Cannot deduct more than current stock of ${item.quantity} ${item.unit}.`);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const updatePayload: Record<string, unknown> = { quantity: newTotal };
    if (mode === 'add') updatePayload.last_restocked = date;

    const { error: dbErr } = await supabase
      .from('inventory_items').update(updatePayload).eq('id', item.id);

    if (dbErr) {
      toast.error('Failed to update stock.');
    } else {
      setSubmitted(true);
      toast.success(`Stock updated. ${item.item_name} is now ${newTotal} ${item.unit}.`);
      onSuccess();
    }
    setLoading(false);
  }

  function handleCancel() {
    if (isDirty) setShowConfirm(true);
    else onCancel();
  }

  function handleQtyChange(value: string) {
    setQty(Number(value));
    setError('');
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Current stock card */}
        <div className={cn(
          'rounded-2xl border px-4 py-3.5',
          isLow
            ? 'bg-red-50/60 border-red-200/60'
            : 'bg-gray-50/80 border-gray-100'
        )}>
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
              isLow ? 'bg-red-100 ring-1 ring-red-200/60' : 'bg-white ring-1 ring-gray-200/60'
            )}>
              {isLow
                ? <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                : <Package className="w-3.5 h-3.5 text-gray-400" />
              }
            </div>

            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-[13px] font-semibold leading-tight truncate',
                isLow ? 'text-red-800' : 'text-gray-800'
              )}>
                {item.item_name}
              </p>
              {isLow && (
                <p className="text-[11px] text-red-500 font-medium mt-0.5">Below reorder level</p>
              )}
            </div>
          </div>

          {/* Stock numbers */}
          <div className="flex gap-5 mt-3 pt-3 border-t border-gray-100">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-0.5">Current Stock</p>
              <p className={cn(
                'text-xl font-bold tabular-nums leading-none',
                isLow ? 'text-red-600' : 'text-gray-800'
              )}>
                {item.quantity}
                <span className="text-[12px] font-normal text-gray-400 ml-1">{item.unit}</span>
              </p>
            </div>
            <div className="w-px bg-gray-200" />
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-0.5">Reorder At</p>
              <p className="text-xl font-bold tabular-nums leading-none text-gray-400">
                {item.reorder_level}
                <span className="text-[12px] font-normal ml-1">{item.unit}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Add / Deduct toggle */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Action</label>
          <div className="flex rounded-xl border border-gray-200 bg-gray-50/80 p-1 gap-1">
            <button
              type="button"
              onClick={() => { setMode('add'); setQty(0); setError(''); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition-all',
                mode === 'add'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Stock
            </button>
            <button
              type="button"
              onClick={() => { setMode('deduct'); setQty(0); setError(''); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition-all',
                mode === 'deduct'
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Minus className="w-3.5 h-3.5" />
              Deduct Stock
            </button>
          </div>
        </div>

        {/* Quantity input */}
        <Input
          label={mode === 'add' ? 'Quantity to Add' : 'Quantity to Deduct'}
          type="number"
          min={1}
          max={mode === 'deduct' ? item.quantity : undefined}
          value={qty || ''}
          onChange={e => handleQtyChange(e.target.value)}
          error={error}
          placeholder="0"
        />

        {/* New total preview */}
        {qty > 0 && !error && (
          <div className={cn(
            'flex items-center justify-between px-4 py-3 rounded-xl border',
            newIsLow
              ? 'bg-red-50/60 border-red-200/60'
              : 'bg-teal-50/60 border-teal-200/60'
          )}>
            <div>
              <p className={cn(
                'text-[10px] font-semibold uppercase tracking-wider',
                newIsLow ? 'text-red-400' : 'text-teal-500'
              )}>
                New total after {mode === 'add' ? 'restocking' : 'deduction'}
              </p>
              {newIsLow && (
                <p className="text-[11px] text-red-500 mt-0.5">Still below reorder level</p>
              )}
            </div>
            <p className={cn(
              'text-xl font-bold tabular-nums',
              newIsLow ? 'text-red-600' : 'text-teal-700'
            )}>
              {newTotal}
              <span className="text-[12px] font-normal ml-1 opacity-70">{item.unit}</span>
            </p>
          </div>
        )}

        {/* Restock date — only for add mode */}
        {mode === 'add' && (
          <Input
            label="Restock Date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            type="submit"
            loading={loading}
            variant={mode === 'deduct' ? 'danger' : 'primary'}
            className="flex-1 sm:flex-none"
          >
            {mode === 'add' ? 'Update Stock' : 'Deduct Stock'}
          </Button>
          <Button type="button" variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </form>

      <UnsavedChangesModal
        open={showConfirm}
        onStay={() => setShowConfirm(false)}
        onLeave={() => { setShowConfirm(false); onCancel(); }}
      />
    </>
  );
}