'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { InventoryItem, InventoryFormData } from '@/types';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { UnsavedChangesModal } from '@/components/ui/UnsavedChangesModal';
import { INVENTORY_CATEGORIES, getTodayString } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Plus, Minus } from 'lucide-react';

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

  const isDirty = !submitted && (
    !!form.item_name || !!form.category || form.quantity > 0
  );

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
        <Input
          label="Item Name" placeholder="e.g. Dental Gloves (Medium)"
          value={form.item_name} onChange={e => set('item_name', e.target.value)}
          error={errors.item_name} required
        />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Category" value={form.category}
            onChange={e => set('category', e.target.value)}
            error={errors.category} placeholder="Select category…">
            {INVENTORY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="Unit" placeholder="pcs, box, bottle…"
            value={form.unit} onChange={e => set('unit', e.target.value)} error={errors.unit} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Current Quantity" type="number" min={0}
            value={form.quantity} onChange={e => set('quantity', Number(e.target.value))} error={errors.quantity} />
          <Input label="Reorder Level" type="number" min={0}
            value={form.reorder_level} onChange={e => set('reorder_level', Number(e.target.value))}
            error={errors.reorder_level} hint="Alert when stock falls below this" />
        </div>
        <Input label="Last Restocked" type="date"
          value={form.last_restocked} onChange={e => set('last_restocked', e.target.value)} />

        <div className="flex gap-3 pt-1">
          <Button type="submit" loading={loading} className="flex-1 sm:flex-none">
            {existing ? 'Save Changes' : 'Add Item'}
          </Button>
          <Button type="button" variant="secondary" onClick={handleCancel}>Cancel</Button>
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

  const newTotal = mode === 'add'
    ? item.quantity + Number(qty)
    : item.quantity - Number(qty);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (qty <= 0) {
      setError('Enter a quantity greater than 0.');
      return;
    }

    if (mode === 'deduct' && qty > item.quantity) {
      setError(`You cannot deduct more than the current stock of ${item.quantity} ${item.unit}.`);
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const updatePayload: Record<string, unknown> = { quantity: newTotal };

    // Only update last_restocked when adding stock
    if (mode === 'add') {
      updatePayload.last_restocked = date;
    }

    const { error: dbErr } = await supabase
      .from('inventory_items')
      .update(updatePayload)
      .eq('id', item.id);

    if (dbErr) {
      toast.error('Failed to update stock.');
    } else {
      setSubmitted(true);
      const action = mode === 'add' ? 'restocked' : 'deducted from';
      toast.success(
        `Stock updated. ${item.item_name} is now ${newTotal} ${item.unit}.`
      );
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

        {/* Current stock info */}
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500">Item</p>
          <p className="font-semibold text-gray-900 mt-0.5">{item.item_name}</p>
          <div className="flex gap-6 mt-3">
            <div>
              <p className="text-xs text-gray-400">Current Stock</p>
              <p className={cn(
                'text-xl font-bold mt-0.5',
                item.quantity <= item.reorder_level ? 'text-red-600' : 'text-gray-900'
              )}>
                {item.quantity}{' '}
                <span className="text-sm font-normal text-gray-400">{item.unit}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Reorder Level</p>
              <p className="text-xl font-bold mt-0.5 text-gray-400">
                {item.reorder_level}{' '}
                <span className="text-sm font-normal">{item.unit}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Add / Deduct toggle */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Action</label>
          <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-gray-50 p-1 gap-1">
            <button
              type="button"
              onClick={() => { setMode('add'); setQty(0); setError(''); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all',
                mode === 'add'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Plus className="w-4 h-4" />
              Add Stock
            </button>
            <button
              type="button"
              onClick={() => { setMode('deduct'); setQty(0); setError(''); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all',
                mode === 'deduct'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Minus className="w-4 h-4" />
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
          hint={
            qty > 0 && !error
              ? `New total will be ${newTotal} ${item.unit}`
              : undefined
          }
        />

        {/* New total preview */}
        {qty > 0 && !error && (
          <div className={cn(
            'flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium',
            newTotal <= item.reorder_level
              ? 'bg-red-50 border-red-100 text-red-700'
              : 'bg-teal-50 border-teal-100 text-teal-700'
          )}>
            <span>New total after {mode === 'add' ? 'restocking' : 'deduction'}</span>
            <span className="text-lg font-bold">
              {newTotal} {item.unit}
            </span>
          </div>
        )}

        {/* Restock date — only shown when adding */}
        {mode === 'add' && (
          <Input
            label="Restock Date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        )}

        <div className="flex gap-3 pt-1">
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
