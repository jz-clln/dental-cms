'use client';

import { Sidebar, BottomNav } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { ToastContainer } from '@/components/ui/Toast';
import { SplashScreen } from '@/components/ui/SplashScreen';
import { NavigationProgress } from '@/components/ui/NavigationProgress';
import { PageLoader } from '@/components/ui/PageLoader';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';
import { useToast } from '@/lib/hooks/useToast';
import { useTutorial } from '@/lib/hooks/useTutorial';
import { createContext, useContext } from 'react';

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
  const { showTutorial, completeTutorial, skipTutorial } = useTutorial();

  return (
    <ToastContext.Provider value={toast}>

      {/* Slim progress bar at very top — fires on every route change */}
      <NavigationProgress />

      {/* Splash screen on first load */}
      <SplashScreen />

      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopBar />

          {/* Main content — PageLoader sits inside here as an overlay */}
          <main className="flex-1 overflow-y-auto pb-20 md:pb-6 relative">
            <div className="p-4 md:p-6 max-w-7xl mx-auto">
              {children}
            </div>

            {/* Route-matched skeleton overlay — hides after 400ms */}
            <PageLoader />
          </main>
        </div>
      </div>

      <BottomNav />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {showTutorial && (
        <TutorialOverlay
          onComplete={completeTutorial}
          onSkip={skipTutorial}
        />
      )}
    </ToastContext.Provider>
  );
}
