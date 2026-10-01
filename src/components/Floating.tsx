import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface FloatingProps {
  x: number;
  y: number;
  /** which corner of the menu sits at (x, y) */
  place?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

/** A viewport-clamped popover rendered in a portal. Closes on outside click / Escape / scroll. */
export function Floating({ x, y, place = 'bottom-start', onClose, children, className = '' }: FloatingProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const clamp = () => {
      // offsetWidth/Height, not getBoundingClientRect(): the open animation starts
      // at scale(0.92), and a transformed rect would under-measure the popover and
      // let it clamp itself off the edge of the window.
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const pad = 10;
      let left = place.endsWith('end') ? x - w : x;
      let top = place.startsWith('top') ? y - h : y;
      left = Math.min(Math.max(pad, left), Math.max(pad, window.innerWidth - w - pad));
      top = Math.min(Math.max(pad, top), Math.max(pad, window.innerHeight - h - pad));
      setPos({ left, top });
    };
    clamp();
    // content that settles late (images, emoji fallback fonts) must re-clamp
    const ro = new ResizeObserver(clamp);
    ro.observe(el);
    return () => ro.disconnect();
  }, [x, y, place]);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    // defer so the opening click doesn't instantly close it
    const t = window.setTimeout(() => document.addEventListener('mousedown', down), 0);
    document.addEventListener('keydown', key);
    window.addEventListener('resize', onClose);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  const originMap: Record<string, string> = {
    'bottom-start': 'top left',
    'bottom-end': 'top right',
    'top-start': 'bottom left',
    'top-end': 'bottom right',
  };

  return createPortal(
    <div
      ref={ref}
      className={`pop ${className}`}
      style={{
        position: 'fixed',
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        visibility: pos ? 'visible' : 'hidden',
        ['--origin' as string]: originMap[place],
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
