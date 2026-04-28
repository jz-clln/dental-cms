'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface UnsavedChangesModalProps {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
}

export function UnsavedChangesModal({ open, onStay, onLeave }: UnsavedChangesModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onStay}
      />
      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="bg-amber-50 rounded-xl p-2.5 flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Unsaved changes</h3>
            <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
              You have unsaved changes. If you leave now, your progress will be lost.
            </p>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onStay}>
            Keep editing
          </Button>
          <button
            type="button"
            onClick={onLeave}
            className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white
              text-sm font-medium transition-colors focus:outline-none focus:ring-2
              focus:ring-red-500 focus:ring-offset-1"
          >
            Discard changes
          </button>
        </div>
      </div>
    </div>
  );
}