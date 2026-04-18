'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { InventoryItem } from '@/types';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { AddItemForm, RestockForm } from '@/components/inventory/InventoryForm';
import { Modal } from '@/components/ui/Modal';
import { useAppToast } from '@/app/(dashboard)/layout';

export default function InventoryPage() {
  const toast = useAppToast();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState<string | null>(null);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null);
  const [restockTarget, setRestockTarget] = useState<InventoryItem | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();

    // Get clinic_id once
    if (!clinicId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: staffData } = await supabase
          .from('staff').select('clinic_id').eq('auth_user_id', user.id).single();
        setClinicId(staffData?.clinic_id ?? null);
      }
    }

    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .order('item_name', { ascending: true });

    setItems((data ?? []) as InventoryItem[]);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { load(); }, [load]);

  function handleSuccess() {
    setShowAddModal(false);
    setEditTarget(null);
    setRestockTarget(null);
    load();
  }

  return (
    <>
      <InventoryTable
        items={items}
        loading={loading}
        onAddItem={() => setShowAddModal(true)}
        onEditItem={item => setEditTarget(item)}
        onRestock={item => setRestockTarget(item)}
        onDeleted={load}
        toast={toast}
      />

      {/* Add Item Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Inventory Item"
        size="md"
      >
        {clinicId && (
          <AddItemForm
            clinicId={clinicId}
            onSuccess={handleSuccess}
            onCancel={() => setShowAddModal(false)}
            toast={toast}
          />
        )}
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Item"
        size="md"
      >
        {editTarget && clinicId && (
          <AddItemForm
            clinicId={clinicId}
            existing={editTarget}
            onSuccess={handleSuccess}
            onCancel={() => setEditTarget(null)}
            toast={toast}
          />
        )}
      </Modal>

      {/* Restock Modal */}
      <Modal
        open={!!restockTarget}
        onClose={() => setRestockTarget(null)}
        title="Update Stock"
        size="sm"
      >
        {restockTarget && (
          <RestockForm
            item={restockTarget}
            onSuccess={handleSuccess}
            onCancel={() => setRestockTarget(null)}
            toast={toast}
          />
        )}
      </Modal>
    </>
  );
}
