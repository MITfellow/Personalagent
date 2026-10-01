import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface LightboxItem {
  src: string;
  /** shown under the photo, e.g. "Maya · Yesterday 4:53 PM" */
  caption?: string;
}

/**
 * Quick Look for photos: full-screen, arrow-key navigable, Escape to close.
 * Rendered in a portal so no thread/sidebar overflow can clip it.
 */
export function Lightbox({
  items,
  startSrc,
  onClose,
}: {
  items: LightboxItem[];
  startSrc: string;
  onClose: () => void;
}) {
  const first = Math.max(0, items.findIndex((i) => i.src === startSrc));
  const [index, setIndex] = useState(first);
  const closeRef = useRef<HTMLButtonElement>(null);

  const count = items.length;
  const item = items[index] ?? items[0];

  const go = useCallback(
    (delta: number) => setIndex((i) => (count ? (i + delta + count) % count : 0)),
    [count],
  );

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setIndex(count - 1);
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [go, onClose, count]);

  if (!item) return null;

  return createPortal(
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onClick={onClose}
    >
      <div className="lb-bar" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} className="lb-btn" onClick={onClose} aria-label="Close photo viewer">
          ✕
        </button>
        {count > 1 && (
          <span className="lb-count" aria-live="polite">
            {index + 1} of {count}
          </span>
        )}
        <a className="lb-btn" href={item.src} download aria-label="Download photo" onClick={(e) => e.stopPropagation()}>
          ↓
        </a>
      </div>

      {count > 1 && (
        <button
          className="lb-nav prev"
          aria-label="Previous photo"
          onClick={(e) => {
            e.stopPropagation();
            go(-1);
          }}
        >
          ‹
        </button>
      )}

      <figure className="lb-figure" onClick={(e) => e.stopPropagation()}>
        <img src={item.src} alt={item.caption ?? 'Photo'} />
        {item.caption && <figcaption>{item.caption}</figcaption>}
      </figure>

      {count > 1 && (
        <button
          className="lb-nav next"
          aria-label="Next photo"
          onClick={(e) => {
            e.stopPropagation();
            go(1);
          }}
        >
          ›
        </button>
      )}
    </div>,
    document.body,
  );
}
