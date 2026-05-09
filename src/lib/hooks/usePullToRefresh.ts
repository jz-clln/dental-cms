import { useState, useCallback, useEffect, useRef } from 'react';

export const PTR_THRESHOLD = 72;
export const PTR_MAX = 96;

export function usePullToRefresh(onRefresh: () => void) {
  const [pullY, setPullY] = useState(0);
  const [triggered, setTriggered] = useState(false);

  // FIX: keep a ref for the live pullY value so onTouchEnd closure is always fresh
  const pullYRef = useRef(0);
  const startY   = useRef<number | null>(null);
  const pulling  = useRef(false);

  // FIX: stable ref for onRefresh so the effect doesn't re-register on every render
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      // FIX: check both documentElement and body (iOS Safari uses body scroll)
      const scrolled =
        document.documentElement.scrollTop > 0 || document.body.scrollTop > 0;
      if (scrolled) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        pullYRef.current = 0;
        setPullY(0);
        return;
      }
      const rubber = Math.min(PTR_MAX, delta * 0.45);
      pullYRef.current = rubber;
      setPullY(rubber);
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullYRef.current >= PTR_THRESHOLD) {
        setTriggered(true);
        onRefreshRef.current();
        setTimeout(() => setTriggered(false), 1000);
      }
      pullYRef.current = 0;
      setPullY(0);
      startY.current = null;
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove',  onTouchMove,  { passive: true });
    window.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove',  onTouchMove);
      window.removeEventListener('touchend',   onTouchEnd);
    };
  }, []); // FIX: stable — no deps change at runtime

  return { pullY, triggered };
}