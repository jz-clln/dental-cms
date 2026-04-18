'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/Sidebar';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/lib/hooks/useToast';
import { createContext, useContext } from 'react';

// Toast context so any child page can trigger toasts
type ToastFn = {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
  warning: (msg: string) => void;
};

export const ToastContext = createContext<ToastFn>({
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
});

export const useAppToast = () => useContext(ToastContext);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { toasts, toast, removeToast } = useToast();

  return (
    <ToastContext.Provider value={toast}>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* Sidebar (desktop) */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
            <div className="p-4 md:p-6 max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}
