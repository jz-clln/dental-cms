'use client';

import { useState, useMemo } from 'react';
import { InventoryItem } from '@/types';
import { formatDateShort } from '@/lib/utils';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import {
  AlertTriangle, Package, Plus, RefreshCw,
  Pencil, Trash2, Search,
} from 'lucide-react';
import { INVENTORY_CATEGORIES } from '@/lib/utils';
import { cn } from '@/lib/utils';

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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-gray-100 animate-pulse rounded-lg w-64" />
        <SkeletonTable rows={7} />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Low stock alert banner */}
      {lowStockCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {lowStockCount} item{lowStockCount > 1 ? 's are' : ' is'} below reorder level and need restocking.
          </p>
          <button
            onClick={() => setFilterLow(true)}
            className="ml-auto text-xs text-red-600 hover:underline font-medium flex-shrink-0"
          >
            View low stock →
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search items…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm w-48
                focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-gray-300 transition-colors"
            />
          </div>

          {/* Category filter */}
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white
              focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-gray-300 transition-colors"
          >
            <option value="">All Categories</option>
            {INVENTORY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Low stock toggle */}
          <button
            onClick={() => setFilterLow(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
              filterLow
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock{lowStockCount > 0 && ` (${lowStockCount})`}
          </button>

          {(search || filterCategory || filterLow) && (
            <Button variant="ghost" size="sm"
              onClick={() => { setSearch(''); setFilterCategory(''); setFilterLow(false); }}
              className="text-gray-500"
            >
              Clear
            </Button>
          )}
        </div>

        <Button size="sm" onClick={onAddItem}>
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3.5 font-medium text-gray-500">Item Name</th>
                <th className="text-left px-5 py-3.5 font-medium text-gray-500">Category</th>
                <th className="text-left px-5 py-3.5 font-medium text-gray-500">Stock</th>
                <th className="text-left px-5 py-3.5 font-medium text-gray-500">Reorder At</th>
                <th className="text-left px-5 py-3.5 font-medium text-gray-500">Last Restocked</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-14">
                    <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">
                      {search || filterCategory || filterLow
                        ? 'No items match your filters.'
                        : 'No inventory items yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(item => {
                  const isLow = item.quantity <= item.reorder_level;
                  return (
                    <tr key={item.id} className={cn('hover:bg-gray-50 transition-colors', isLow && 'bg-red-50/40')}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-2 h-2 rounded-full flex-shrink-0',
                            isLow ? 'bg-red-500' : 'bg-green-400'
                          )} />
                          <span className="font-medium text-gray-900">{item.item_name}</span>
                          {isLow && (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                              <AlertTriangle className="w-3 h-3" /> Low
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn(
                          'font-semibold',
                          isLow ? 'text-red-600' : 'text-gray-900'
                        )}>
                          {item.quantity}
                        </span>
                        <span className="text-gray-400 text-xs ml-1">{item.unit}</span>
                      </td>
                      <td className="px-5 py-4 text-gray-500">
                        {item.reorder_level} {item.unit}
                      </td>
                      <td className="px-5 py-4 text-gray-500 text-xs">
                        {item.last_restocked ? formatDateShort(item.last_restocked) : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => onRestock(item)}
                            title="Restock"
                            className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50 transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditItem(item)}
                            title="Edit"
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            title="Delete"
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <div className="text-center py-14">
              <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No items match your filters.</p>
            </div>
          ) : (
            filtered.map(item => {
              const isLow = item.quantity <= item.reorder_level;
              return (
                <div key={item.id} className={cn('px-4 py-4', isLow && 'bg-red-50/40')}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 truncate">{item.item_name}</p>
                        {isLow && (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                            <AlertTriangle className="w-3 h-3" /> Low
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{item.category}</p>
                      <p className={cn('text-sm font-semibold mt-2', isLow ? 'text-red-600' : 'text-gray-900')}>
                        {item.quantity} <span className="text-gray-400 font-normal text-xs">{item.unit}</span>
                        <span className="text-gray-400 font-normal text-xs ml-2">(reorder at {item.reorder_level})</span>
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => onRestock(item)}
                        className="p-2 rounded-lg text-teal-600 hover:bg-teal-50 transition-colors">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button onClick={() => onEditItem(item)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(item)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-50 bg-gray-50">
            <p className="text-xs text-gray-400">
              Showing {filtered.length} of {items.length} item{items.length !== 1 ? 's' : ''}
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
