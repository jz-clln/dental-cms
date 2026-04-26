'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function NavigationProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout[]>([]);

  function clearTimers() {
    timerRef.current.forEach(t => clearTimeout(t));
    timerRef.current = [];
  }

  function addTimer(fn: () => void, delay: number) {
    const t = setTimeout(fn, delay);
    timerRef.current.push(t);
    return t;
  }

  useEffect(() => {
    // Every time the path changes, the page has already loaded.
    // We run a quick "completion" animation: flash in → fill to 100% → hide.
    clearTimers();

    setProgress(0);
    setVisible(true);

    // Quick progress to 80%
    addTimer(() => setProgress(80), 10);
    // Then shoot to 100%
    addTimer(() => setProgress(100), 200);
    // Then fade out
    addTimer(() => setVisible(false), 500);
    addTimer(() => setProgress(0), 600);

    return clearTimers;
  }, [pathname]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[300] h-0.5 pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 200ms ease' }}
    >
      <div
        className="h-full bg-teal-500"
        style={{
          width: `${progress}%`,
          transition: progress === 0
            ? 'none'
            : progress === 100
              ? 'width 200ms ease-in'
              : 'width 300ms ease-out',
          boxShadow: '0 0 8px rgba(20,184,166,0.7)',
        }}
      />
    </div>
  );
}
