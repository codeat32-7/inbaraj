'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CareerTimeline from './CareerTimeline';

export default function TimelineButton() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Lock page scroll while the overlay is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        className="tl-trigger"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="See my career as a timeline"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 12h18" />
          <circle cx="6" cy="12" r="2.2" fill="currentColor" />
          <circle cx="12" cy="12" r="2.2" fill="currentColor" />
          <circle cx="18" cy="12" r="2.2" fill="currentColor" />
          <path d="M6 7v3M12 17v-3M18 7v3" />
        </svg>
        <span>Timeline</span>
      </button>
      {open &&
        createPortal(
          <div className="tl-overlay" role="dialog" aria-modal="true" aria-label="Career timeline">
            <CareerTimeline onClose={close} />
          </div>,
          document.body,
        )}
    </>
  );
}
