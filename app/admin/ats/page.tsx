'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { CLAUDE_MODELS, DEFAULT_MODEL } from '@/lib/models';

interface RequirementResult {
  requirement: string;
  verdict: 'covered' | 'partial' | 'missing' | null;
  confidence: number | null;
  evidence: string | null;
  reason?: string;
  ms?: number;
  error?: string;
}

interface Report {
  score: number;
  breakdown: { keywords: number; requirements: number; format: number };
  keywords: { matched: string[]; missing: string[] };
  requirements: RequirementResult[];
  checks: { label: string; passed: boolean }[];
  method: 'jev' | 'claude' | 'heuristic';
  model?: string;
  timing: { judgeMs: number; calls: number; avgMs: number; p50Ms: number; maxMs: number };
  errors: number;
}

type RunState =
  | { status: 'idle' }
  | { status: 'running'; startedAt: number }
  | { status: 'done'; report: Report; clientMs: number }
  | { status: 'error'; message: string; clientMs: number };

interface RegistryEntry {
  company: string;
  created: string;
  active: boolean;
}

const COLORS = { covered: '#4ade80', partial: '#fbbf24', missing: '#f87171' } as const;

const fmt = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`);
const scoreColor = (n: number) => (n >= 75 ? '#4ade80' : n >= 50 ? '#fbbf24' : '#f87171');

export default function AtsValidatorPage() {
  // null on the server/first paint, then the session password ('' if not logged in).
  const password = useSyncExternalStore(
    () => () => {},
    () => sessionStorage.getItem('admin_pwd') ?? '',
    () => null
  );
  const [registry, setRegistry] = useState<Record<string, RegistryEntry>>({});
  const [slug, setSlug] = useState('base');
  const [jd, setJd] = useState('');
  const [modelChoice, setModelChoice] = useState<string | null>(null);
  const storedModel = useSyncExternalStore(
    () => () => {},
    () => localStorage.getItem('resume-model'),
    () => null
  );
  const model =
    modelChoice ?? (storedModel && CLAUDE_MODELS.some((m) => m.id === storedModel) ? storedModel : DEFAULT_MODEL);
  const setModel = setModelChoice;
  const [jev, setJev] = useState<RunState>({ status: 'idle' });
  const [claude, setClaude] = useState<RunState>({ status: 'idle' });
  const [now, setNow] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!password) return;
    fetch('/api/profiles', { headers: { 'x-admin-password': password } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setRegistry(d.registry))
      .catch(() => {});
  }, [password]);

  const running = jev.status === 'running' || claude.status === 'running';

  // Live stopwatch while either block is running.
  useEffect(() => {
    if (running) {
      timer.current = setInterval(() => setNow(performance.now()), 50);
      return () => {
        if (timer.current) clearInterval(timer.current);
      };
    }
  }, [running]);

  const run = useCallback(
    async (judge: 'jev' | 'claude', set: (s: RunState) => void) => {
      const startedAt = performance.now();
      set({ status: 'running', startedAt });
      try {
        const res = await fetch('/api/ats-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-password': password ?? '' },
          body: JSON.stringify({ jobDescription: jd, slug, judge, model }),
        });
        const data = await res.json();
        const clientMs = performance.now() - startedAt;
        if (!res.ok) set({ status: 'error', message: data.error || 'Scoring failed', clientMs });
        else set({ status: 'done', report: data, clientMs });
      } catch (e) {
        set({ status: 'error', message: e instanceof Error ? e.message : 'Request failed', clientMs: performance.now() - startedAt });
      }
    },
    [password, jd, slug, model]
  );

  const runBoth = () => {
    // Fire together so each block's clock starts at the same moment.
    void run('jev', setJev);
    void run('claude', setClaude);
  };

  if (password === null) return <div style={s.page} />;
  if (!password) {
    return (
      <div style={s.page}>
        <div style={s.shell}>
          <h1 style={s.h1}>ATS validator</h1>
          <p style={s.muted}>
            You need to be logged in first. <a href="/admin" style={s.link}>Log in at /admin</a>, then come back.
          </p>
        </div>
      </div>
    );
  }

  const bothDone = jev.status === 'done' && claude.status === 'done';
  const entries = Object.entries(registry).sort(([, a], [, b]) => (b.created || '').localeCompare(a.created || ''));

  return (
    <div style={s.page}>
      <div style={s.shell}>
        <a href="/admin" style={s.link}>← Back to studio</a>
        <h1 style={s.h1}>ATS validator</h1>
        <p style={s.muted}>
          The same job description and resume, judged two ways at once. Keywords and format checks are identical for
          both; only the requirement matching differs.
        </p>

        <div style={s.form}>
          <div style={s.formRow}>
            <label style={s.label}>
              Resume
              <select value={slug} onChange={(e) => setSlug(e.target.value)} style={s.input}>
                <option value="base">Base resume</option>
                {entries.map(([sl, e]) => (
                  <option key={sl} value={sl}>{e.company} — /r/{sl}</option>
                ))}
              </select>
            </label>
            <label style={s.label}>
              Claude model
              <select value={model} onChange={(e) => setModel(e.target.value)} style={s.input}>
                {CLAUDE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label} — {m.hint}</option>
                ))}
              </select>
            </label>
          </div>
          <label style={s.label}>
            Job description
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              rows={9}
              placeholder="Paste the job description here…"
              style={{ ...s.input, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </label>
          <div>
            <button onClick={runBoth} disabled={running || !jd.trim()} style={{ ...s.run, opacity: running || !jd.trim() ? 0.5 : 1 }}>
              {running ? 'Running…' : 'Run both validators'}
            </button>
            <span style={{ ...s.muted, marginLeft: 12 }}>
              The first run includes cold-start time. Run again for warm numbers.
            </span>
          </div>
        </div>

        <div style={s.blocks}>
          <Block
            title="Jev"
            subtitle="TypeSafe classifier · probabilities, no reasoning text"
            state={jev}
            now={now}
          />
          <Block
            title="Claude"
            subtitle={`${CLAUDE_MODELS.find((m) => m.id === model)?.label ?? model} · one-line reason per requirement`}
            state={claude}
            now={now}
          />
        </div>

        {bothDone && <Comparison jev={jev.report} claude={claude.report} jevClient={jev.clientMs} claudeClient={claude.clientMs} />}
      </div>
    </div>
  );
}

function Block({ title, subtitle, state, now }: { title: string; subtitle: string; state: RunState; now: number }) {
  const elapsed = state.status === 'running' ? Math.max(0, now - state.startedAt) : 0;
  return (
    <section style={s.block}>
      <header style={s.blockHead}>
        <div>
          <div style={s.blockTitle}>{title}</div>
          <div style={s.muted}>{subtitle}</div>
        </div>
        <div style={s.clock}>
          {state.status === 'running' && <span style={{ color: '#fbbf24' }}>{fmt(elapsed)}</span>}
          {state.status === 'done' && <span style={{ color: '#2dd4a8' }}>{fmt(state.clientMs)}</span>}
          {state.status === 'error' && <span style={{ color: '#f87171' }}>{fmt(state.clientMs)}</span>}
          {state.status === 'idle' && <span style={{ color: '#4a4a58' }}>—</span>}
        </div>
      </header>

      {state.status === 'idle' && <p style={s.muted}>Waiting to run.</p>}
      {state.status === 'running' && <p style={s.muted}>Judging requirements…</p>}
      {state.status === 'error' && <p style={{ color: '#f87171', fontSize: 13 }}>{state.message}</p>}
      {state.status === 'done' && <Result report={state.report} clientMs={state.clientMs} />}
    </section>
  );
}

function Result({ report, clientMs }: { report: Report; clientMs: number }) {
  const t = report.timing;
  return (
    <>
      <div style={s.scoreRow}>
        <div>
          <div style={s.bigLabel}>Requirement match</div>
          <div style={{ ...s.big, color: scoreColor(report.breakdown.requirements) }}>{report.breakdown.requirements}</div>
        </div>
        <div>
          <div style={s.bigLabel}>Overall</div>
          <div style={{ ...s.big, color: scoreColor(report.score) }}>{report.score}</div>
        </div>
      </div>

      <div style={s.stats}>
        <Stat label="Round trip" value={fmt(clientMs)} />
        <Stat label="Judging (server)" value={fmt(t.judgeMs)} />
        <Stat label="Calls" value={String(t.calls)} />
        <Stat label="Avg / call" value={fmt(t.avgMs)} />
        <Stat label="p50" value={fmt(t.p50Ms)} />
        <Stat label="Slowest" value={fmt(t.maxMs)} />
      </div>
      <p style={s.muted}>Calls run 5 at a time, so judging time is less than calls × average.</p>

      {report.errors > 0 && <p style={{ color: '#f87171', fontSize: 13 }}>{report.errors} call(s) failed and are excluded from the score.</p>}

      <div style={s.reqList}>
        {report.requirements.map((r, i) => (
          <div key={i} style={s.req}>
            <span style={{ ...s.dot, background: r.verdict ? COLORS[r.verdict] : '#4a4a58' }} title={r.verdict ?? 'error'} />
            <div style={{ flex: 1 }}>
              <div style={s.reqText}>{r.requirement}</div>
              <div style={s.reqMeta}>
                {r.verdict ?? 'error'}
                {r.confidence !== null && ` · ${Math.round(r.confidence * 100)}%`}
                {r.ms !== undefined && ` · ${fmt(r.ms)}`}
                {r.reason && ` — ${r.reason}`}
                {r.error && ` — ${r.error}`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={s.stat}>
      <div style={s.statValue}>{value}</div>
      <div style={s.statLabel}>{label}</div>
    </div>
  );
}

function Comparison({ jev, claude, jevClient, claudeClient }: { jev: Report; claude: Report; jevClient: number; claudeClient: number }) {
  const rows = jev.requirements.map((j, i) => ({ j, c: claude.requirements[i] })).filter((x) => x.c);
  const comparable = rows.filter((x) => x.j.verdict && x.c.verdict);
  const agree = comparable.filter((x) => x.j.verdict === x.c.verdict);
  const disagree = comparable.filter((x) => x.j.verdict !== x.c.verdict);
  const faster = jevClient <= claudeClient ? 'Jev' : 'Claude';
  const ratio = Math.max(jevClient, claudeClient) / Math.max(1, Math.min(jevClient, claudeClient));
  const scoreDiff = jev.breakdown.requirements - claude.breakdown.requirements;

  return (
    <section style={s.compare}>
      <div style={s.blockTitle}>Comparison</div>
      <div style={s.stats}>
        <Stat label="Faster (round trip)" value={`${faster} ${ratio.toFixed(1)}×`} />
        <Stat label="Same verdict" value={`${agree.length} / ${comparable.length}`} />
        <Stat label="Requirement score gap" value={`${scoreDiff > 0 ? '+' : ''}${scoreDiff} (Jev − Claude)`} />
      </div>
      {disagree.length > 0 ? (
        <>
          <div style={{ ...s.muted, margin: '12px 0 6px' }}>Where they disagree</div>
          {disagree.map(({ j, c }, i) => (
            <div key={i} style={s.diff}>
              <div style={s.reqText}>{j.requirement}</div>
              <div style={s.reqMeta}>
                Jev: <b style={{ color: COLORS[j.verdict!] }}>{j.verdict}</b>
                {j.confidence !== null && ` (${Math.round(j.confidence * 100)}%)`} · Claude:{' '}
                <b style={{ color: COLORS[c.verdict!] }}>{c.verdict}</b>
                {c.reason && ` — ${c.reason}`}
              </div>
            </div>
          ))}
        </>
      ) : (
        <p style={s.muted}>They agree on every requirement.</p>
      )}
      <p style={s.muted}>
        This compares two judges on one job description. It shows how they differ, not which is right — read the
        disagreements and decide.
      </p>
    </section>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0a0a0b', color: '#e8e8ec', fontFamily: "'DM Sans', sans-serif" },
  shell: { maxWidth: 1180, margin: '0 auto', padding: '2rem 1.25rem 4rem' },
  h1: { fontFamily: "'Spectral', serif", fontWeight: 300, fontSize: '2rem', margin: '0.6rem 0 0.4rem' },
  muted: { color: '#8a8aa0', fontSize: 13, lineHeight: 1.5 },
  link: { color: '#2dd4a8', fontSize: 13, textDecoration: 'none' },
  form: { display: 'flex', flexDirection: 'column', gap: 14, margin: '1.25rem 0', padding: 16, border: '1px solid #2a2a30', borderRadius: 10, background: '#0e0e10' },
  formRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#8a8aa0' },
  input: { background: '#141418', color: '#e8e8ec', border: '1px solid #2a2a30', borderRadius: 8, padding: '9px 11px', fontSize: 13 },
  run: { background: '#2dd4a8', color: '#0a0a0b', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 13 },
  blocks: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))', gap: 16, alignItems: 'start' },
  block: { border: '1px solid #2a2a30', borderRadius: 10, padding: 16, background: '#0e0e10', minWidth: 0, width: '100%', boxSizing: 'border-box' },
  blockHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  blockTitle: { fontSize: 15, fontWeight: 600 },
  clock: { fontFamily: "'DM Mono', monospace", fontSize: 22 },
  scoreRow: { display: 'flex', gap: 32, marginBottom: 12 },
  bigLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#8a8aa0' },
  big: { fontSize: 40, fontWeight: 700, lineHeight: 1.1 },
  stats: { display: 'flex', flexWrap: 'wrap', gap: 10, margin: '8px 0' },
  stat: { background: '#141418', border: '1px solid #2a2a30', borderRadius: 8, padding: '8px 12px', minWidth: 92 },
  statValue: { fontFamily: "'DM Mono', monospace", fontSize: 15 },
  statLabel: { fontSize: 11, color: '#8a8aa0', marginTop: 2 },
  reqList: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 },
  req: { display: 'flex', gap: 10, alignItems: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0 },
  reqText: { fontSize: 13 },
  reqMeta: { fontSize: 12, color: '#8a8aa0', marginTop: 2 },
  compare: { marginTop: 16, border: '1px solid #2a2a30', borderRadius: 10, padding: 16, background: '#0e0e10' },
  diff: { padding: '8px 0', borderTop: '1px solid #1d1d22' },
};
