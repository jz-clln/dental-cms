'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { InventoryItem } from '@/types';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import {
  AlertTriangle, Package, Plus, RefreshCw,
  Pencil, Trash2, Search, Check, ChevronDown,
} from 'lucide-react';
import { INVENTORY_CATEGORIES } from '@/lib/utils';
import { cn } from '@/lib/utils';

/* ── Safe date formatter ── */
function formatRestocked(raw: string | null | undefined): string {
  if (!raw) return '—';
  const d = new Date(raw.replace(' ', 'T'));
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ── Custom Dropdown ── */
interface DropdownOption { label: string; value: string; }

function CustomDropdown({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: DropdownOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 pl-2.5 pr-1.5 py-1.5 rounded-xl border border-gray-200
          bg-white text-[11px] md:text-[12px] font-medium text-gray-600
          hover:border-gray-300 transition-colors focus:outline-none
          focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400
          whitespace-nowrap max-w-[120px] md:max-w-none"
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown className={cn(
          'w-3 h-3 flex-shrink-0 text-gray-400 transition-transform',
          open && 'rotate-180'
        )} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white rounded-xl border border-gray-200
          shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden min-w-[160px]">
          {/* Reset option */}
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className="w-full flex items-center justify-between px-3 py-2 text-[12px]
              text-gray-500 hover:bg-gray-50 transition-colors"
          >
            {placeholder}
            {!value && <Check className="w-3 h-3 text-teal-600" />}
          </button>
          <div className="h-px bg-gray-100 mx-2" />
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2 text-[12px]
                text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {opt.label}
              {value === opt.value && <Check className="w-3 h-3 text-teal-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface InventoryTableProps {
  items: InventoryItem[];
  loading?: boolean;
  onAddItem: () => void;
  onEditItem: (item: InventoryItem) => void;
  onRestock: (item: InventoryItem) => void;
  onDeleted: () => void;
  toast: { success: (m: string) => void; error: (m: string) => void };
}

export function InventoryTable({
  items, loading, onAddItem, onEditItem, onRestock, onDeleted, toast,
}: InventoryTableProps) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLow, setFilterLow] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    return items.filter(item => {
      const matchSearch = item.item_name.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCategory ? item.category === filterCategory : true;
      const matchLow = filterLow ? item.quantity <= item.reorder_level : true;
      return matchSearch && matchCat && matchLow;
    });
  }, [items, search, filterCategory, filterLow]);

  const lowStockCount = items.filter(i => i.quantity <= i.reorder_level).length;

  const categoryOptions: DropdownOption[] = INVENTORY_CATEGORIES.map(c => ({
    label: c, value: c,
  }));

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('inventory_items').delete().eq('id', deleteTarget.id);
    if (error) {
      toast.error('Failed to delete item.');
    } else {
      toast.success(`"${deleteTarget.item_name}" removed from inventory.`);
      onDeleted();
    }
    setDeleting(false);
    setDeleteTarget(null);
  }

  const hasFilters = search || filterCategory || filterLow;

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 bg-gray-100 animate-pulse rounded-xl w-52" />
        <SkeletonTable rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* Low stock alert */}
      {lowStockCount > 0 && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-red-50 border border-red-200/70 rounded-xl">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          <p className="text-[12px] text-red-700 font-medium flex-1">
            {lowStockCount} item{lowStockCount > 1 ? 's' : ''} below reorder level.
          </p>
          <button
            onClick={() => setFilterLow(true)}
            className="text-[11px] text-red-600 hover:text-red-700 font-semibold flex-shrink-0 transition-colors"
          >
            View →
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 justify-between flex-wrap md:flex-nowrap">
        <div className="flex items-center gap-1.5 flex-wrap">

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search items…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-[11px] md:text-[12px]
                w-36 md:w-44 focus:outline-none focus:ring-2 focus:ring-teal-500/30
                focus:border-teal-400 hover:border-gray-300 transition-colors placeholder:text-gray-300"
            />
          </div>

          {/* Category dropdown */}
          <CustomDropdown
            options={categoryOptions}
            value={filterCategory}
            onChange={setFilterCategory}
            placeholder="All Categories"
          />

          {/* Low stock toggle */}
          <button
            onClick={() => setFilterLow(v => !v)}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] md:text-[12px] font-semibold transition-all',
              filterLow
                ? 'bg-red-500 text-white border-red-500 shadow-sm shadow-red-100'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
            )}
          >
            <AlertTriangle className="w-3 h-3" />
            Low{lowStockCount > 0 && ` (${lowStockCount})`}
          </button>

          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setFilterCategory(''); setFilterLow(false); }}
              className="text-[11px] text-gray-400 hover:text-gray-600 px-1.5 py-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        <Button size="sm" onClick={onAddItem} className="flex-shrink-0 md:text-[12px] md:px-3 md:py-1.5 md:gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Item</span>
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Item Name', 'Category', 'Stock', 'Reorder At', 'Last Restocked', ''].map((h, i) => (
                  <th key={i} className="text-left px-5 py-3 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-14">
                    <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-[12px] text-gray-400">
                      {hasFilters ? 'No items match your filters.' : 'No inventory items yet.'}
                    </p>
                  </td>
                </tr>
              ) : filtered.map(item => {
                const isLow = item.quantity <= item.reorder_level;
                return (
                  <tr
                    key={item.id}
                    className={cn(
                      'group transition-colors hover:bg-gray-50/70',
                      isLow && 'bg-red-50/30'
                    )}
                  >
                    {/* Item name */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'w-1.5 h-1.5 rounded-full flex-shrink-0',
                          isLow ? 'bg-red-500' : 'bg-green-400'
                        )} />
                        <span className="text-[13px] font-semibold text-gray-800">{item.item_name}</span>
                        {isLow && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-200/70 font-semibold">
                            <AlertTriangle className="w-2.5 h-2.5" /> Low
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-3">
                      <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                        {item.category}
                      </span>
                    </td>

                    {/* Stock */}
                    <td className="px-5 py-3">
                      <span className={cn(
                        'text-[13px] font-bold tabular-nums',
                        isLow ? 'text-red-600' : 'text-gray-800'
                      )}>
                        {item.quantity}
                      </span>
                      <span className="text-[11px] text-gray-400 ml-1">{item.unit}</span>
                    </td>

                    {/* Reorder at */}
                    <td className="px-5 py-3">
                      <span className="text-[12px] text-gray-500 tabular-nums">
                        {item.reorder_level} {item.unit}
                      </span>
                    </td>

                    {/* Last restocked */}
                    <td className="px-5 py-3">
                      <span className="text-[11px] text-gray-400 tabular-nums">
                        {formatRestocked(item.last_restocked)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onRestock(item)}
                          title="Restock"
                          className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50 transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditItem(item)}
                          title="Edit"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          title="Delete"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-[12px] text-gray-400">No items match your filters.</p>
            </div>
          ) : filtered.map(item => {
            const isLow = item.quantity <= item.reorder_level;
            return (
              <div key={item.id} className={cn('px-4 py-3', isLow && 'bg-red-50/30')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5', isLow ? 'bg-red-500' : 'bg-green-400')} />
                      <p className="text-[13px] font-semibold text-gray-800 truncate">{item.item_name}</p>
                      {isLow && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full border border-red-200/70 font-semibold">
                          <AlertTriangle className="w-2.5 h-2.5" /> Low
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5 ml-3.5">{item.category}</p>
                    <p className={cn('text-[12px] font-bold mt-1.5 ml-3.5 tabular-nums', isLow ? 'text-red-600' : 'text-gray-800')}>
                      {item.quantity}
                      <span className="text-gray-400 font-normal text-[11px] ml-1">{item.unit}</span>
                      <span className="text-gray-400 font-normal text-[11px] ml-2">· reorder at {item.reorder_level}</span>
                    </p>
                  </div>
                  <div className="flex gap-0.5 flex-shrink-0">
                    <button onClick={() => onRestock(item)}
                      className="p-2 rounded-xl text-teal-600 hover:bg-teal-50 transition-colors">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onEditItem(item)}
                      className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(item)}
                      className="p-2 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-5 py-2 border-t border-gray-50 bg-gray-50/60">
            <p className="text-[11px] text-gray-400 tabular-nums">
              {filtered.length} of {items.length} item{items.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Inventory Item"
        message={`Are you sure you want to remove "${deleteTarget?.item_name}" from inventory? This cannot be undone.`}
        confirmLabel="Delete Item"
      />
    </div>
  );
}