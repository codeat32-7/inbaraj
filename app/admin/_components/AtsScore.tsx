'use client';

import { useState } from 'react';

interface RequirementResult {
  requirement: string;
  verdict: 'covered' | 'partial' | 'missing';
  confidence: number;
  evidence: string | null;
}

interface AtsReport {
  score: number;
  breakdown: { keywords: number; requirements: number; format: number };
  keywords: { matched: string[]; missing: string[] };
  requirements: RequirementResult[];
  checks: { label: string; passed: boolean }[];
  method: 'jev' | 'heuristic';
  jevError?: string;
}

interface AtsScoreProps {
  jobDescription: string;
  overrides: Record<string, unknown>;
  password: string;
}

const VERDICT_COLOR = { covered: '#4ade80', partial: '#fbbf24', missing: '#f87171' } as const;

function scoreColor(n: number): string {
  return n >= 75 ? '#4ade80' : n >= 50 ? '#fbbf24' : '#f87171';
}

export default function AtsScore({ jobDescription, overrides, password }: AtsScoreProps) {
  const [report, setReport] = useState<AtsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ats-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ jobDescription, overrides }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scoring failed');
      setReport(data);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scoring failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.wrap}>
      <div style={s.row}>
        <div>
          <div style={s.title}>ATS match</div>
          <div style={s.sub}>How well this page matches the job description. Re-score after edits.</div>
        </div>
        <div style={s.actions}>
          {report && (
            <span style={{ ...s.score, color: scoreColor(report.score) }}>{report.score}</span>
          )}
          <button onClick={run} disabled={loading} style={s.btn}>
            {loading ? 'Scoring…' : report ? 'Re-score' : 'Score ATS match'}
          </button>
          {report && (
            <button onClick={() => setOpen(!open)} style={s.btnGhost}>
              {open ? 'Hide' : 'Details'}
            </button>
          )}
        </div>
      </div>

      {error && <div style={s.error}>{error}</div>}

      {report && open && (
        <div style={s.body}>
          <div style={s.bars}>
            {(
              [
                ['Keywords', report.breakdown.keywords],
                ['Requirements', report.breakdown.requirements],
                ['Format', report.breakdown.format],
              ] as const
            ).map(([label, v]) => (
              <div key={label} style={s.barRow}>
                <span style={s.barLabel}>{label}</span>
                <div style={s.barTrack}>
                  <div style={{ ...s.barFill, width: `${v}%`, background: scoreColor(v) }} />
                </div>
                <span style={s.barVal}>{v}</span>
              </div>
            ))}
          </div>

          <div style={s.note}>
            {report.method === 'jev'
              ? 'Requirement matching judged by Jev.'
              : 'Requirement matching used the keyword-overlap fallback (Jev not used).'}
            {report.jevError ? ` Jev error: ${report.jevError}.` : ''} This is an estimate, not a real ATS result.
          </div>

          {report.keywords.missing.length > 0 && (
            <div style={s.block}>
              <div style={s.blockTitle}>Missing keywords</div>
              <div style={s.chips}>
                {report.keywords.missing.map((k) => (
                  <span key={k} style={s.chipMissing}>{k}</span>
                ))}
              </div>
              <div style={s.hint}>Only add a keyword if it is true for you. Do not add skills you do not have.</div>
            </div>
          )}

          <div style={s.block}>
            <div style={s.blockTitle}>Requirements</div>
            {report.requirements.map((r, i) => (
              <div key={i} style={s.req}>
                <span style={{ ...s.dot, background: VERDICT_COLOR[r.verdict] }} title={r.verdict} />
                <div>
                  <div style={s.reqText}>{r.requirement}</div>
                  {r.verdict !== 'covered' && r.evidence && (
                    <div style={s.reqEvidence}>Closest: {r.evidence}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={s.block}>
            <div style={s.blockTitle}>Parse-ability</div>
            {report.checks.map((c) => (
              <div key={c.label} style={s.check}>
                <span style={{ color: c.passed ? '#4ade80' : '#f87171' }}>{c.passed ? '✓' : '✗'}</span> {c.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: { border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 16, marginBottom: 16 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  title: { fontWeight: 600, fontSize: 14 },
  sub: { fontSize: 12, opacity: 0.6, marginTop: 2 },
  actions: { display: 'flex', alignItems: 'center', gap: 10 },
  score: { fontSize: 28, fontWeight: 700, minWidth: 44, textAlign: 'right' },
  btn: { padding: '8px 14px', borderRadius: 8, border: 'none', background: '#7c6af7', color: '#fff', cursor: 'pointer', fontSize: 13 },
  btnGhost: { padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: 13 },
  error: { marginTop: 10, color: '#f87171', fontSize: 13 },
  body: { marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 },
  bars: { display: 'flex', flexDirection: 'column', gap: 6 },
  barRow: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 },
  barLabel: { width: 100, opacity: 0.8 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  barFill: { height: '100%' },
  barVal: { width: 28, textAlign: 'right' },
  note: { fontSize: 12, opacity: 0.6 },
  block: { display: 'flex', flexDirection: 'column', gap: 6 },
  blockTitle: { fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.7 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chipMissing: { fontSize: 12, padding: '3px 8px', borderRadius: 999, background: 'rgba(248,113,113,0.12)', color: '#f87171' },
  hint: { fontSize: 12, opacity: 0.6 },
  req: { display: 'flex', gap: 10, alignItems: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0 },
  reqText: { fontSize: 13 },
  reqEvidence: { fontSize: 12, opacity: 0.55, marginTop: 2 },
  check: { fontSize: 13 },
};
