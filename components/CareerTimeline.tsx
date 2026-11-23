'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { chapters, chapterRanges } from '@/lib/timeline';

const SPEED = 1.5; // years per second while travelling
const DWELL_MS = 2600; // pause at the start of each chapter so the panel can be read
const FOCUS_OFFSET = 0.12; // years into a chapter where the traveller pauses

interface Props {
  onClose: () => void;
}

export default function CareerTimeline({ onClose }: Props) {
  const ranges = useMemo(() => chapterRanges(), []);
  const first = ranges[0].from;
  const last = ranges[ranges.length - 1].to;
  const axisStart = Math.floor(first) - 0.4;
  const axisEnd = Math.ceil(last) + 1.1;

  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [finished, setFinished] = useState(false);

  // Live animation state lives in refs: the frame loop writes straight to the DOM.
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const travellerRef = useRef<HTMLDivElement>(null);
  const yearLabelRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const barFillRefs = useRef<(HTMLDivElement | null)[]>([]);
  const panelRef = useRef<HTMLOListElement>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);

  const yearRef = useRef(first);
  const targetRef = useRef<number | null>(null);
  const playingRef = useRef(true);
  const pauseUntilRef = useRef(0);
  const dwelledRef = useRef<boolean[]>(chapters.map(() => false));
  const activeRef = useRef(0);
  const ppyRef = useRef(230);
  const reducedRef = useRef(false);

  const trackWidthFor = (ppy: number) => (axisEnd - axisStart) * ppy;
  const xOf = (year: number) => (year - axisStart) * ppyRef.current;

  const paint = useCallback(
    (year: number) => {
      const viewport = viewportRef.current;
      const track = trackRef.current;
      if (!viewport || !track) return;
      const x = (year - axisStart) * ppyRef.current;
      const w = viewport.clientWidth;
      const tx = Math.min(0, Math.max(w - (axisEnd - axisStart) * ppyRef.current, w * 0.36 - x));
      track.style.transform = `translate3d(${tx}px,0,0)`;
      if (travellerRef.current) travellerRef.current.style.left = `${x}px`;
      if (fillRef.current) fillRef.current.style.width = `${x}px`;
      if (yearLabelRef.current) yearLabelRef.current.textContent = String(Math.floor(year));
      ranges.forEach((r, i) => {
        const el = barFillRefs.current[i];
        if (!el) return;
        const frac = Math.max(0, Math.min(1, (year - r.from) / (r.to - r.from)));
        el.style.transform = `scaleX(${frac})`;
      });
    },
    [axisStart, axisEnd, ranges],
  );

  const activeForYear = useCallback(
    (year: number) => {
      let idx = 0;
      ranges.forEach((r, i) => {
        if (year >= r.from - 0.001) idx = i;
      });
      return idx;
    },
    [ranges],
  );

  const syncActive = useCallback(
    (idx: number) => {
      if (idx !== activeRef.current) {
        activeRef.current = idx;
        setActive(idx);
      }
    },
    [],
  );

  const setPlay = useCallback((value: boolean) => {
    playingRef.current = value;
    setPlaying(value);
  }, []);

  const jumpTo = useCallback(
    (idx: number, keepPlaying = false) => {
      const target = ranges[idx].from + FOCUS_OFFSET;
      dwelledRef.current = chapters.map((_, i) => i <= idx);
      setFinished(false);
      if (!keepPlaying) setPlay(false);
      pauseUntilRef.current = performance.now() + DWELL_MS;
      if (reducedRef.current) {
        yearRef.current = target;
        targetRef.current = null;
        paint(target);
      } else {
        targetRef.current = target;
      }
      syncActive(idx);
    },
    [paint, ranges, setPlay, syncActive],
  );

  const replay = useCallback(() => {
    yearRef.current = first;
    targetRef.current = null;
    dwelledRef.current = chapters.map(() => false);
    pauseUntilRef.current = performance.now() + 600;
    activeRef.current = 0;
    setActive(0);
    setFinished(false);
    paint(first);
    if (!reducedRef.current) setPlay(true);
  }, [first, paint, setPlay]);

  // Frame loop
  useEffect(() => {
    reducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const compact = window.matchMedia('(max-width: 768px)').matches;
    ppyRef.current = compact ? 150 : 230;
    if (trackRef.current) trackRef.current.style.width = `${trackWidthFor(ppyRef.current)}px`;
    paint(yearRef.current);
    if (reducedRef.current) {
      playingRef.current = false;
      queueMicrotask(() => setPlaying(false));
    }
    pauseUntilRef.current = performance.now() + 900;

    let raf = 0;
    let lastT = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      let y = yearRef.current;
      const tgt = targetRef.current;
      if (tgt !== null) {
        const d = tgt - y;
        y += d * Math.min(1, dt * 7);
        if (Math.abs(d) < 0.004) {
          y = tgt;
          targetRef.current = null;
        }
      } else if (playingRef.current && now >= pauseUntilRef.current) {
        y += SPEED * dt;
        for (let i = 0; i < ranges.length; i += 1) {
          const focus = ranges[i].from + FOCUS_OFFSET;
          if (!dwelledRef.current[i] && y >= focus) {
            dwelledRef.current[i] = true;
            y = focus;
            pauseUntilRef.current = now + DWELL_MS;
            break;
          }
        }
        if (y >= last) {
          y = last;
          playingRef.current = false;
          setPlaying(false);
          setFinished(true);
        }
      }
      yearRef.current = y;
      paint(y);
      syncActive(activeForYear(y));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onResize = () => {
      const c = window.matchMedia('(max-width: 768px)').matches;
      ppyRef.current = c ? 150 : 230;
      if (trackRef.current) trackRef.current.style.width = `${(axisEnd - axisStart) * ppyRef.current}px`;
      paint(yearRef.current);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the active chapter's row visible in the side panel (scroll the panel only, not the page).
  useEffect(() => {
    const panel = panelRef.current;
    const row = rowRefs.current[active];
    if (!panel || !row) return;
    const top = row.offsetTop - panel.offsetTop - 12;
    panel.scrollTo({ top: Math.max(0, top), behavior: reducedRef.current ? 'auto' : 'smooth' });
  }, [active]);

  // Keyboard: Esc closes, arrows move between chapters, space plays/pauses.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') jumpTo(Math.min(chapters.length - 1, activeRef.current + 1));
      else if (e.key === 'ArrowLeft') jumpTo(Math.max(0, activeRef.current - 1));
      else if (e.key === ' ' && document.activeElement?.tagName !== 'BUTTON') {
        e.preventDefault();
        setPlay(!playingRef.current);
      }
    };
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [jumpTo, onClose, setPlay]);

  const years: number[] = [];
  for (let y = Math.ceil(axisStart); y <= Math.ceil(last); y += 1) years.push(y);

  const current = chapters[active];

  return (
    <div className="tl-shell">
      {/* ───── 60%: horizontal career timeline ───── */}
      <section className="tl-stage" aria-label="Career timeline">
        <header className="tl-stage-head">
          <span className="tl-kicker">Career timeline</span>
          <button ref={closeRef} className="tl-close" onClick={onClose} aria-label="Close timeline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
            <span>Close</span>
          </button>
        </header>

        <div className="tl-readout" key={current.id}>
          <div className={`tl-readout-value ${current.color}`}>{current.headline.value}</div>
          <div className="tl-readout-label">{current.headline.label}</div>
          <div className="tl-readout-where">
            {current.company} · {current.role}
          </div>
        </div>

        <div className="tl-viewport" ref={viewportRef}>
          <div className="tl-track" ref={trackRef} style={{ width: trackWidthFor(230) }}>
            <div className="tl-axis" />
            <div className="tl-axis-fill" ref={fillRef} />
            {years.map((y) => (
              <div key={y} className="tl-tick" style={{ left: xOf(y) }}>
                <span>{y}</span>
              </div>
            ))}

            {ranges.map((r, i) => {
              const c = chapters[i];
              const left = xOf(r.from);
              const width = Math.max(14, xOf(r.to) - xOf(r.from));
              const reached = i <= active;
              return (
                <div key={c.id}>
                  <button
                    className={`tl-bar ${c.color}${i === active ? ' is-active' : ''}`}
                    style={{ left, width }}
                    onClick={() => jumpTo(i)}
                    aria-label={`${c.company}, ${c.period}`}
                  >
                    <div className="tl-bar-fill" ref={(el) => { barFillRefs.current[i] = el; }} />
                  </button>
                  <div className={`tl-label ${c.color}${reached ? ' is-on' : ''}`} style={{ left }}>
                    <div className="tl-label-co">{c.company}</div>
                    <div className="tl-label-role">{c.role}</div>
                    <div className="tl-label-period">{c.period}</div>
                  </div>
                  <div className={`tl-chip ${c.color}${reached ? ' is-on' : ''}`} style={{ left }}>
                    <strong>{c.headline.value}</strong> {c.headline.label}
                  </div>
                </div>
              );
            })}

            <div className="tl-traveller" ref={travellerRef}>
              <span className="tl-year" ref={yearLabelRef}>{Math.floor(first)}</span>
              <span className="tl-dot" />
            </div>
          </div>
        </div>

        <footer className="tl-controls">
          <div className="tl-btns">
            <button className="tl-btn" onClick={() => jumpTo(Math.max(0, active - 1))} aria-label="Previous chapter" disabled={active === 0}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            {finished ? (
              <button className="tl-btn tl-btn-main" onClick={replay} aria-label="Replay">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
                <span>Replay</span>
              </button>
            ) : (
              <button className="tl-btn tl-btn-main" onClick={() => setPlay(!playing)} aria-label={playing ? 'Pause' : 'Play'}>
                {playing ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" /></svg>
                )}
                <span>{playing ? 'Pause' : 'Play'}</span>
              </button>
            )}
            <button className="tl-btn" onClick={() => jumpTo(Math.min(chapters.length - 1, active + 1))} aria-label="Next chapter" disabled={active === chapters.length - 1}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>
          <div className="tl-dots" role="tablist" aria-label="Chapters">
            {chapters.map((c, i) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={i === active}
                className={`tl-pip ${c.color}${i === active ? ' is-active' : ''}`}
                onClick={() => jumpTo(i)}
                aria-label={c.company}
              />
            ))}
          </div>
          <span className="tl-hint">← → to move · space to pause · Esc to close</span>
        </footer>
      </section>

      {/* ───── 40%: chapters from where it started ───── */}
      <aside className="tl-side" aria-label="Chapter details">
        <div className="tl-side-head">
          <span className="tl-kicker">Where it started → where it is now</span>
        </div>
        <ol className="tl-list" ref={panelRef}>
          {chapters.map((c, i) => (
            <li
              key={c.id}
              ref={(el) => { rowRefs.current[i] = el; }}
              className={`tl-row ${c.color}${i === active ? ' is-active' : ''}${i <= active ? ' is-reached' : ''}`}
            >
              <button className="tl-row-hit" onClick={() => jumpTo(i)} aria-label={`Show ${c.company}`} tabIndex={-1} />
              <div className="tl-col tl-col-work">
                <div className="tl-row-period">{c.period}</div>
                <h3 className="tl-row-co">{c.company}</h3>
                <div className="tl-row-role">{c.role}</div>
                <ul>
                  {c.work.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
              <div className="tl-col tl-col-gain">
                <div className="tl-gain-label">What I learned</div>
                <ul>
                  {c.learned.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
                <div className="tl-gain-label tl-gain-achieved">What I achieved</div>
                <ul>
                  {c.achieved.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
