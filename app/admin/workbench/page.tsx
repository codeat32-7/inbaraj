'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import './workbench.css';
import { CLAUDE_MODELS, DEFAULT_MODEL } from '@/lib/models';
import { appendLabel, applyTextEdit, getTargets, isAppendPath } from '@/lib/resume-edit';
import type { ResumeData } from '@/lib/types';

// ───────────────────────────── types ─────────────────────────────

type Verdict = 'covered' | 'partial' | 'missing' | null;
type Judge = 'jev' | 'claude' | 'heuristic';
type Kind = 'rephrase' | 'needs-fact' | 'true-gap';
type Overrides = Record<string, unknown>;

interface Req {
  requirement: string;
  verdict: Verdict;
  confidence: number | null;
  evidence: string | null;
  reason?: string;
  error?: string;
}
interface Report {
  score: number;
  breakdown: { keywords: number; requirements: number; format: number };
  keywords: { matched: string[]; missing: string[] };
  requirements: Req[];
  checks: { label: string; passed: boolean }[];
  method: Judge;
  model?: string;
  errors: number;
  timing: { judgeMs: number; calls: number };
}
interface Triage { kind: Kind; reason: string; question?: string | null }
interface FactCheck { passed: boolean; issues: string[]; checkedWith: string }
interface Edit { path: string; before: string | null; after: string }
interface Proposal { kind: Kind; explanation: string; question: string | null; edit: Edit | null; factCheck: FactCheck | null; candidateFact?: string }
interface HistoryPoint { score: number; label: string; method: Judge; at: number }
interface AddedFact { fact: string; requirement: string; path: string; at: number }
interface KwSupport { supportable: string[]; unsupported: string[] }
interface RegistryEntry { company: string; created: string; active: boolean }
interface Session { key: string; slug: string; label: string; mode: 'profile' | 'base' | 'draft' }
interface Stored {
  jd: string;
  overrides: Overrides;
  history: HistoryPoint[];
  decisions: Record<string, 'gap'>;
  triage: Record<string, Triage>;
  facts: AddedFact[];
  kwSupport: KwSupport | null;
}
interface Handoff { company: string; slug: string; jobDescription: string; overrides: Overrides; at: number }

const TARGET = 95;
const KEYWORDS_ID = '__keywords__';
const JUDGE_LABEL: Record<Judge, string> = { jev: 'Jev', claude: 'Claude', heuristic: 'keyword heuristic' };
const KIND_LABEL: Record<Kind, string> = { rephrase: 'Reword', 'needs-fact': 'Needs your fact', 'true-gap': 'Real gap' };

const val = (v: Verdict) => (v === 'covered' ? 1 : v === 'partial' ? 0.5 : 0);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const ringColor = (n: number) => (n >= TARGET ? 'var(--teal)' : n >= 75 ? 'var(--accent2)' : n >= 50 ? 'var(--amber)' : 'var(--pink)');

const noopSub = () => () => {};

// ───────────────────────────── small views ─────────────────────────────

function Gauge({ score }: { score: number }) {
  const r = 58;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const tick = (TARGET / 100) * 2 * Math.PI - Math.PI / 2;
  const tx = 70 + Math.cos(tick) * (r + 9);
  const ty = 70 + Math.sin(tick) * (r + 9);
  const tx2 = 70 + Math.cos(tick) * (r - 9);
  const ty2 = 70 + Math.sin(tick) * (r - 9);
  return (
    <svg viewBox="0 0 140 140" className="wb-gauge" role="img" aria-label={`ATS score ${score} out of 100; target ${TARGET}`}>
      <circle cx="70" cy="70" r={r} className="wb-gauge-track" />
      <circle
        cx="70"
        cy="70"
        r={r}
        className="wb-gauge-bar"
        style={{ stroke: ringColor(score), strokeDasharray: c, strokeDashoffset: c * (1 - pct / 100) }}
        transform="rotate(-90 70 70)"
      />
      <line x1={tx} y1={ty} x2={tx2} y2={ty2} className="wb-gauge-target" />
      <text x="70" y="68" textAnchor="middle" className="wb-gauge-num">{Math.round(score)}</text>
      <text x="70" y="88" textAnchor="middle" className="wb-gauge-sub">{score >= TARGET ? 'target reached' : `target ${TARGET}`}</text>
    </svg>
  );
}

function Spark({ points }: { points: HistoryPoint[] }) {
  const w = 260;
  const h = 70;
  if (!points.length) return null;
  const xs = (i: number) => (points.length === 1 ? w / 2 : 8 + (i * (w - 16)) / (points.length - 1));
  const ys = (n: number) => h - 8 - (Math.max(0, Math.min(100, n)) / 100) * (h - 16);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xs(i).toFixed(1)} ${ys(p.score).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="wb-spark" role="img" aria-label="Score history">
      <line x1="0" x2={w} y1={ys(TARGET)} y2={ys(TARGET)} className="wb-spark-target" />
      <path d={d} className="wb-spark-line" />
      {points.map((p, i) => (
        <circle key={i} cx={xs(i)} cy={ys(p.score)} r={i === points.length - 1 ? 4.5 : 3} className="wb-spark-dot">
          <title>{`${p.label}: ${p.score}`}</title>
        </circle>
      ))}
    </svg>
  );
}

// ───────────────────────────── page ─────────────────────────────

export default function WorkbenchPage() {
  const password = useSyncExternalStore(noopSub, () => sessionStorage.getItem('admin_pwd') ?? '', () => null);
  const handoffRaw = useSyncExternalStore(noopSub, () => localStorage.getItem('workbench-handoff'), () => null);
  const storedModel = useSyncExternalStore(noopSub, () => localStorage.getItem('resume-model'), () => null);

  const [modelChoice, setModelChoice] = useState<string | null>(null);
  const model = modelChoice ?? (storedModel && CLAUDE_MODELS.some((m) => m.id === storedModel) ? storedModel : DEFAULT_MODEL);

  const [registry, setRegistry] = useState<Record<string, RegistryEntry>>({});
  const [formSlug, setFormSlug] = useState('base');
  const [formJd, setFormJd] = useState('');

  const [session, setSession] = useState<Session | null>(null);
  const [jd, setJd] = useState('');
  const [baseData, setBaseData] = useState<ResumeData | null>(null);
  const [overrides, setOverrides] = useState<Overrides>({});
  const [report, setReport] = useState<Report | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [decisions, setDecisions] = useState<Record<string, 'gap'>>({});
  const [triage, setTriage] = useState<Record<string, Triage>>({});
  const [kwSupport, setKwSupport] = useState<KwSupport | null>(null);
  const [facts, setFacts] = useState<AddedFact[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Record<string, Proposal>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [undoStack, setUndoStack] = useState<{ overrides: Overrides; report: Report; history: HistoryPoint[] }[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<{ validate: boolean; triage: boolean; propose: string | null; check: boolean; save: boolean; start: boolean }>({
    validate: false, triage: false, propose: null, check: false, save: false, start: false,
  });
  const [msg, setMsg] = useState<{ kind: 'info' | 'ok' | 'err'; text: string } | null>(null);

  const judgePref = useRef<Judge | null>(null);

  const handoff: Handoff | null = useMemo(() => {
    if (!handoffRaw) return null;
    try {
      const h = JSON.parse(handoffRaw) as Handoff;
      return h && typeof h.jobDescription === 'string' && h.overrides ? h : null;
    } catch {
      return null;
    }
  }, [handoffRaw]);

  useEffect(() => {
    if (!password) return;
    fetch('/api/profiles', { headers: { 'x-admin-password': password } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setRegistry(d.registry))
      .catch(() => {});
  }, [password]);

  // Persist the working session in this browser (no database): survives refreshes.
  useEffect(() => {
    if (!session || !report) return;
    const stored: Stored = { jd, overrides, history, decisions, triage, facts, kwSupport };
    try {
      localStorage.setItem(session.key, JSON.stringify(stored));
    } catch {
      /* storage unavailable: the session just won't survive a refresh */
    }
  }, [session, report, jd, overrides, history, decisions, triage, facts, kwSupport]);

  const call = useCallback(
    async (path: string, method: 'GET' | 'POST' | 'PATCH', body?: unknown) => {
      const res = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password ?? '' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data: data as Record<string, unknown> };
    },
    [password]
  );

  /** Score with Jev first, falling back (visibly) to Claude, then the keyword heuristic. */
  const score = useCallback(
    async (ov: Overrides, jdText: string): Promise<Report> => {
      const order: Judge[] = judgePref.current ? [judgePref.current, 'jev', 'claude', 'heuristic'] : ['jev', 'claude', 'heuristic'];
      const tried = new Set<Judge>();
      for (const j of order) {
        if (tried.has(j)) continue;
        tried.add(j);
        const r = await call('/api/ats-score', 'POST', { jobDescription: jdText, overrides: ov, judge: j, model });
        if (r.ok) {
          judgePref.current = j;
          return r.data as unknown as Report;
        }
        if (r.status === 400 && /not configured/i.test(String(r.data.error))) continue;
        throw new Error(String(r.data.error ?? 'Scoring failed'));
      }
      throw new Error('No judge is available.');
    },
    [call, model]
  );

  const flash = (kind: 'info' | 'ok' | 'err', text: string) => setMsg({ kind, text });

  // ───────── session start ─────────

  const start = useCallback(
    async (opts: { slug: string; label: string; mode: Session['mode']; jdText: string; initial?: Overrides }) => {
      if (!opts.jdText.trim()) return flash('err', 'Paste the job description first.');
      setBusy((b) => ({ ...b, start: true }));
      setMsg(null);
      try {
        const baseRes = await call('/api/base', 'GET');
        if (!baseRes.ok) throw new Error('Could not load the base resume.');
        const base = baseRes.data as unknown as ResumeData;

        let ov: Overrides = opts.initial ?? {};
        if (opts.mode === 'profile') {
          const p = await call(`/api/profiles/${opts.slug}`, 'GET');
          if (!p.ok) throw new Error('Could not load that profile.');
          const { meta: _meta, ...rest } = p.data;
          void _meta;
          ov = rest;
        }

        const key = `wb:v1:${opts.mode}:${opts.slug}`;
        let restored: Stored | null = null;
        try {
          const raw = localStorage.getItem(key);
          if (raw) restored = JSON.parse(raw) as Stored;
        } catch {
          restored = null;
        }
        const useRestored = Boolean(restored && restored.jd === opts.jdText && confirm(`Resume your previous workbench session for ${opts.label}?`));

        const working = useRestored && restored ? restored.overrides : ov;
        const rep = await score(working, opts.jdText);

        setBaseData(base);
        setSession({ key, slug: opts.slug, label: opts.label, mode: opts.mode });
        setJd(opts.jdText);
        setOverrides(working);
        setReport(rep);
        setHistory(useRestored && restored?.history.length ? restored.history : [{ score: rep.score, label: 'Start', method: rep.method, at: Date.now() }]);
        setDecisions(useRestored && restored ? restored.decisions : {});
        setTriage(useRestored && restored ? restored.triage : {});
        setKwSupport(useRestored && restored ? restored.kwSupport : null);
        setFacts(useRestored && restored ? restored.facts : []);
        setProposals({});
        setDrafts({});
        setUndoStack([]);
        setDirty(false);
        setSelected(null);
        if (opts.mode === 'draft') {
          try {
            localStorage.removeItem('workbench-handoff');
          } catch {
            /* ignore */
          }
        }
      } catch (e) {
        flash('err', e instanceof Error ? e.message : 'Could not start the session.');
      } finally {
        setBusy((b) => ({ ...b, start: false }));
      }
    },
    [call, score]
  );

  // ───────── derived ─────────

  const gaps = useMemo(() => {
    if (!report) return [];
    return report.requirements
      .map((r, index) => ({ ...r, index }))
      .filter((r) => r.verdict !== 'covered')
      .sort((a, b) => {
        const da = decisions[a.requirement] ? 1 : 0;
        const db = decisions[b.requirement] ? 1 : 0;
        if (da !== db) return da - db;
        return val(a.verdict) - val(b.verdict);
      });
  }, [report, decisions]);

  const ceiling = useMemo(() => {
    if (!report || !Object.keys(triage).length) return null;
    const n = report.requirements.length || 1;
    const gain = (kind: Kind) =>
      report.requirements.reduce((sum, r) => {
        const t = triage[r.requirement];
        if (!t || t.kind !== kind || r.verdict === 'covered' || decisions[r.requirement]) return sum;
        return sum + (1 - val(r.verdict)) * (0.5 / n) * 100;
      }, 0);
    const kwTotal = report.keywords.matched.length + report.keywords.missing.length || 1;
    const kwGain = kwSupport ? 35 * (kwSupport.supportable.length / kwTotal) : 0;
    const reword = Math.min(100, report.score + gain('rephrase') + kwGain);
    const withFacts = Math.min(100, reword + gain('needs-fact'));
    const questions = report.requirements.filter((r) => triage[r.requirement]?.kind === 'needs-fact' && r.verdict !== 'covered' && !decisions[r.requirement]).length;
    return { reword, withFacts, questions };
  }, [report, triage, decisions, kwSupport]);

  // ───────── actions ─────────

  const revalidate = async () => {
    if (!session) return;
    setBusy((b) => ({ ...b, validate: true }));
    try {
      const rep = await score(overrides, jd);
      setReport(rep);
      setHistory((h) => [...h, { score: rep.score, label: 'Re-validated', method: rep.method, at: Date.now() }]);
      flash('ok', `${JUDGE_LABEL[rep.method]} score: ${Math.round(rep.score)}.`);
    } catch (e) {
      flash('err', e instanceof Error ? e.message : 'Scoring failed.');
    } finally {
      setBusy((b) => ({ ...b, validate: false }));
    }
  };

  const runTriage = async () => {
    if (!report) return;
    const items = gaps.filter((g) => !decisions[g.requirement]).map((g) => ({ index: g.index, requirement: g.requirement, verdict: g.verdict, evidence: g.evidence }));
    if (!items.length) return flash('info', 'No open gaps to triage.');
    setBusy((b) => ({ ...b, triage: true }));
    try {
      const r = await call('/api/ats-fix', 'POST', { mode: 'triage', jobDescription: jd, overrides, model, gaps: items, missingKeywords: report.keywords.missing });
      if (!r.ok) throw new Error(String(r.data.error ?? 'Triage failed'));
      const next: Record<string, Triage> = {};
      for (const it of (r.data.items as { index: number; kind: Kind; reason: string; question?: string | null }[]) ?? []) {
        const req = report.requirements[it.index];
        if (req) next[req.requirement] = { kind: it.kind, reason: it.reason, question: it.question };
      }
      setTriage((t) => ({ ...t, ...next }));
      setKwSupport((r.data.keywordSupport as KwSupport | null) ?? null);
      flash('ok', `Claude sorted ${Object.keys(next).length} gaps. Start with the ones marked “Reword”.`);
    } catch (e) {
      flash('err', e instanceof Error ? e.message : 'Triage failed.');
    } finally {
      setBusy((b) => ({ ...b, triage: false }));
    }
  };

  const propose = async (g: { requirement: string; verdict: Verdict; evidence: string | null }, extra?: { candidateFact?: string; reviewerNote?: string }) => {
    setBusy((b) => ({ ...b, propose: g.requirement }));
    try {
      const r = await call('/api/ats-fix', 'POST', {
        mode: 'propose', jobDescription: jd, overrides, model,
        requirement: g.requirement, verdict: g.verdict, evidence: g.evidence,
        candidateFact: extra?.candidateFact, reviewerNote: extra?.reviewerNote,
      });
      if (!r.ok) throw new Error(String(r.data.error ?? 'Claude could not propose a change'));
      const p = r.data as unknown as Proposal;
      setProposals((m) => ({ ...m, [g.requirement]: { ...p, candidateFact: extra?.candidateFact } }));
      setDrafts((d) => {
        const copy = { ...d };
        delete copy[g.requirement];
        return copy;
      });
    } catch (e) {
      flash('err', e instanceof Error ? e.message : 'Claude request failed.');
    } finally {
      setBusy((b) => ({ ...b, propose: null }));
    }
  };

  const recheck = async (reqText: string, p: Proposal, text: string) => {
    if (!p.edit) return;
    setBusy((b) => ({ ...b, check: true }));
    try {
      const r = await call('/api/ats-fix', 'POST', { mode: 'check', jobDescription: jd, overrides, model, path: p.edit.path, after: text, candidateFact: p.candidateFact });
      if (!r.ok) throw new Error(String(r.data.error ?? 'Check failed'));
      setProposals((m) => ({ ...m, [reqText]: { ...p, factCheck: r.data.factCheck as FactCheck, edit: { ...p.edit!, after: text } } }));
      setDrafts((d) => {
        const copy = { ...d };
        delete copy[reqText];
        return copy;
      });
    } catch (e) {
      flash('err', e instanceof Error ? e.message : 'Check failed.');
    } finally {
      setBusy((b) => ({ ...b, check: false }));
    }
  };

  const accept = async (reqText: string, p: Proposal) => {
    if (!p.edit || !baseData || !report) return;
    const before = report;
    const prevHistory = history;
    const newOv = applyTextEdit(baseData, overrides, p.edit.path, p.edit.after);
    setBusy((b) => ({ ...b, validate: true }));
    try {
      const rep = await score(newOv, jd);
      setUndoStack((u) => [...u, { overrides, report: before, history: prevHistory }]);
      setOverrides(newOv);
      setReport(rep);
      const label = isAppendPath(p.edit.path) ? `Added: ${clip(p.edit.after, 40)}` : `Reworded: ${clip(reqText, 40)}`;
      setHistory((h) => [...h, { score: rep.score, label, method: rep.method, at: Date.now() }]);
      if (p.candidateFact) setFacts((f) => [...f, { fact: p.candidateFact!, requirement: reqText, path: p.edit!.path, at: Date.now() }]);
      setProposals((m) => {
        const copy = { ...m };
        delete copy[reqText];
        return copy;
      });
      setDirty(true);
      const now = rep.requirements.find((r) => r.requirement === reqText)?.verdict;
      const delta = Math.round(rep.score - before.score);
      flash(
        delta > 0 ? 'ok' : 'info',
        `${JUDGE_LABEL[rep.method]} re-scored: ${Math.round(before.score)} → ${Math.round(rep.score)} (${delta >= 0 ? '+' : ''}${delta}). This gap is now ${now ?? 'unjudged'}.`
      );
    } catch (e) {
      flash('err', `Change not applied: ${e instanceof Error ? e.message : 'scoring failed'}.`);
    } finally {
      setBusy((b) => ({ ...b, validate: false }));
    }
  };

  const undo = () => {
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    setOverrides(last.overrides);
    setReport(last.report);
    setHistory(last.history);
    setUndoStack((u) => u.slice(0, -1));
    setDirty(true);
    flash('info', 'Last change undone.');
  };

  const save = async () => {
    if (!session || session.mode !== 'profile') return;
    if (!confirm(`Save these changes to the live page for ${session.label}? This commits to GitHub and redeploys the site.`)) return;
    setBusy((b) => ({ ...b, save: true }));
    try {
      const r = await call(`/api/profiles/${session.slug}`, 'PATCH', { overrides });
      if (!r.ok) throw new Error(String(r.data.error ?? 'Save failed'));
      setDirty(false);
      flash('ok', 'Saved. The page redeploys in about a minute.');
    } catch (e) {
      flash('err', e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setBusy((b) => ({ ...b, save: false }));
    }
  };

  const sendBack = () => {
    if (!session) return;
    try {
      const ch = new BroadcastChannel('resume-studio');
      ch.postMessage({ type: 'workbench-overrides', slug: session.slug, overrides });
      ch.close();
      flash('ok', 'Sent to the Studio tab. Switch back to it to review and publish.');
    } catch {
      flash('err', 'Could not reach the Studio tab. Use “Copy JSON” and paste it there.');
    }
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(overrides, null, 2));
      flash('ok', 'Overrides copied.');
    } catch {
      flash('err', 'Could not copy to the clipboard.');
    }
  };

  const resetSession = () => {
    if (!session) return;
    if (!confirm('Discard all workbench changes and start over?')) return;
    try {
      localStorage.removeItem(session.key);
    } catch {
      /* ignore */
    }
    setSession(null);
    setReport(null);
    setMsg(null);
  };

  // ───────── gates ─────────

  if (password === null) return <div className="wb-page" />;
  if (!password) {
    return (
      <div className="wb-page">
        <div className="wb-shell">
          <h1 className="wb-h1">ATS workbench</h1>
          <p className="wb-muted">You need to be logged in first. <a href="/admin" className="wb-link">Log in at /admin</a>, then reopen this page.</p>
        </div>
      </div>
    );
  }

  // ───────── setup screen ─────────

  if (!session || !report) {
    const entries = Object.entries(registry).sort(([, a], [, b]) => (b.created || '').localeCompare(a.created || ''));
    return (
      <div className="wb-page">
        <div className="wb-shell wb-setup">
          <a href="/admin" className="wb-link">← Resume Studio</a>
          <h1 className="wb-h1">ATS workbench</h1>
          <p className="wb-lede">
            Work through every ATS gap with Claude, one at a time. Jev re-scores after each change, so you see what actually moved the number. Claude may only reword facts that are already true of you, or ask you a question. It never invents.
          </p>

          {handoff && (
            <div className="wb-card wb-handoff">
              <div>
                <div className="wb-kicker">From the Studio</div>
                <strong>{handoff.company || 'Generated resume'}</strong>
                <span className="wb-muted"> · sent {new Date(handoff.at).toLocaleTimeString()}</span>
              </div>
              <button
                className="wb-btn wb-btn-primary"
                disabled={busy.start}
                onClick={() => start({ slug: handoff.slug || 'draft', label: handoff.company || 'Draft', mode: 'draft', jdText: handoff.jobDescription, initial: handoff.overrides })}
              >
                {busy.start ? 'Scoring…' : 'Open this draft'}
              </button>
            </div>
          )}

          <div className="wb-card">
            <label className="wb-label" htmlFor="wb-src">Resume</label>
            <select id="wb-src" className="wb-input" value={formSlug} onChange={(e) => setFormSlug(e.target.value)}>
              <option value="base">Base resume</option>
              {entries.map(([s, e]) => (
                <option key={s} value={s}>{e.company} · {e.created}</option>
              ))}
            </select>
            <label className="wb-label" htmlFor="wb-jd">Job description</label>
            <textarea id="wb-jd" className="wb-input wb-textarea" rows={10} value={formJd} onChange={(e) => setFormJd(e.target.value)} placeholder="Paste the job description (requirements, responsibilities, nice-to-haves)." />
            <div className="wb-row">
              <select className="wb-input wb-select-sm" value={model} onChange={(e) => setModelChoice(e.target.value)} aria-label="Claude model">
                {CLAUDE_MODELS.map((m) => (<option key={m.id} value={m.id}>{m.label}</option>))}
              </select>
              <button
                className="wb-btn wb-btn-primary"
                disabled={busy.start || !formJd.trim()}
                onClick={() => {
                  const label = formSlug === 'base' ? 'Base resume' : registry[formSlug]?.company ?? formSlug;
                  void start({ slug: formSlug, label, mode: formSlug === 'base' ? 'base' : 'profile', jdText: formJd });
                }}
              >
                {busy.start ? 'Scoring…' : 'Score and open'}
              </button>
            </div>
          </div>
          {msg && <div className={`wb-msg wb-msg-${msg.kind}`} role="status">{msg.text}</div>}
        </div>
      </div>
    );
  }

  // ───────── dashboard ─────────

  const targets = baseData ? getTargets(baseData, overrides) : [];
  const sel = selected === KEYWORDS_ID ? null : gaps.find((g) => g.requirement === selected) ?? null;
  const proposal = sel ? proposals[sel.requirement] : undefined;
  const t = sel ? triage[sel.requirement] : undefined;
  const crossed = report.score >= TARGET;
  const heuristic = report.method === 'heuristic';
  const kwMissing = report.keywords.missing;

  return (
    <div className="wb-page">
      <div className="wb-shell wb-wide">
        <header className="wb-top">
          <div>
            <a href="/admin" className="wb-link">← Resume Studio</a>
            <h1 className="wb-h1">{session.label}</h1>
            <div className="wb-chips">
              <span className={`wb-chip ${heuristic ? 'wb-chip-warn' : 'wb-chip-ok'}`}>Judged by {JUDGE_LABEL[report.method]}{report.method === 'claude' && report.model ? ` (${report.model})` : ''}</span>
              {report.errors > 0 && <span className="wb-chip wb-chip-warn">{report.errors} judge call{report.errors > 1 ? 's' : ''} failed</span>}
              {session.mode === 'draft' && <span className="wb-chip">Unpublished draft</span>}
              {dirty && <span className="wb-chip wb-chip-accent">Unsaved changes</span>}
            </div>
          </div>
          <div className="wb-actions-top">
            <select className="wb-input wb-select-sm" value={model} onChange={(e) => setModelChoice(e.target.value)} aria-label="Claude model">
              {CLAUDE_MODELS.map((m) => (<option key={m.id} value={m.id}>{m.label}</option>))}
            </select>
            <button className="wb-btn" onClick={revalidate} disabled={busy.validate}>{busy.validate ? 'Scoring…' : `Re-validate with ${JUDGE_LABEL[judgePref.current ?? report.method]}`}</button>
            <button className="wb-btn" onClick={undo} disabled={!undoStack.length}>Undo</button>
            {session.mode === 'draft' ? (
              <button className="wb-btn wb-btn-primary" onClick={sendBack}>Send back to Studio</button>
            ) : session.mode === 'profile' ? (
              <button className="wb-btn wb-btn-primary" onClick={save} disabled={!dirty || busy.save}>{busy.save ? 'Saving…' : 'Save to live page'}</button>
            ) : (
              <button className="wb-btn" onClick={copyJson} title="Base resume changes are made in data/base.json, not saved from here">Copy JSON</button>
            )}
            <button className="wb-btn wb-btn-ghost" onClick={resetSession}>Reset</button>
          </div>
        </header>

        {msg && <div className={`wb-msg wb-msg-${msg.kind}`} role="status">{msg.text}</div>}
        {heuristic && (
          <div className="wb-msg wb-msg-err" role="alert">
            Neither Jev nor Claude could judge this, so the score above is only the keyword heuristic. It is not a valid check for the 95% target; check that TYPESAFE_API_KEY or ANTHROPIC_API_KEY is set for this deployment.
          </div>
        )}

        <section className="wb-summary">
          <div className="wb-card wb-score">
            <Gauge score={report.score} />
            <div className="wb-bars">
              {([['Keywords', report.breakdown.keywords, '35%'], ['Requirements', report.breakdown.requirements, '50%'], ['Parse checks', report.breakdown.format, '15%']] as const).map(([name, v, w]) => (
                <div key={name} className="wb-bar-row">
                  <div className="wb-bar-head"><span>{name}</span><span className="wb-muted">{Math.round(v)} · weight {w}</span></div>
                  <div className="wb-bar"><div className="wb-bar-fill" style={{ width: `${Math.max(2, Math.min(100, v))}%`, background: ringColor(v) }} /></div>
                </div>
              ))}
            </div>
          </div>

          <div className="wb-card">
            <div className="wb-kicker">What it takes to reach {TARGET}</div>
            {crossed ? (
              <p className="wb-good">You are at {Math.round(report.score)}, over the target. Every change was judged by {JUDGE_LABEL[report.method]}.</p>
            ) : ceiling ? (
              <>
                <div className="wb-ceil"><span>Rewording alone</span><strong>≈ {Math.round(ceiling.reword)}</strong></div>
                <div className="wb-ceil"><span>If you also confirm {ceiling.questions} fact{ceiling.questions === 1 ? '' : 's'} are true</span><strong>≈ {Math.round(ceiling.withFacts)}</strong></div>
                <p className="wb-muted wb-small">Estimates from Claude’s triage. Real gaps stay gaps: nothing is added that you can’t back up.</p>
                {ceiling.withFacts < TARGET && <p className="wb-warn wb-small">Even with every fact confirmed, this role tops out near {Math.round(ceiling.withFacts)}%. Reaching {TARGET} would mean claiming experience you don’t have.</p>}
              </>
            ) : (
              <>
                <p className="wb-muted wb-small">Let Claude sort every open gap into <em>reword</em>, <em>needs your fact</em>, or <em>real gap</em>, and see the honest ceiling.</p>
                <button className="wb-btn wb-btn-primary" onClick={runTriage} disabled={busy.triage || !gaps.length}>{busy.triage ? 'Claude is reading the gaps…' : `Triage ${gaps.filter((g) => !decisions[g.requirement]).length} gaps with Claude`}</button>
              </>
            )}
            {ceiling && !crossed && <button className="wb-btn wb-btn-ghost wb-mt" onClick={runTriage} disabled={busy.triage}>{busy.triage ? 'Re-reading…' : 'Re-triage'}</button>}
          </div>

          <div className="wb-card">
            <div className="wb-kicker">Score history</div>
            <Spark points={history} />
            <ul className="wb-history">
              {history.slice(-4).map((h, i) => (
                <li key={i}><span>{clip(h.label, 34)}</span><strong>{Math.round(h.score)}</strong></li>
              ))}
            </ul>
          </div>
        </section>

        <section className="wb-main">
          <aside className="wb-list" aria-label="Gaps">
            <div className="wb-list-head">
              <span className="wb-kicker">Gaps ({gaps.length})</span>
              {facts.length > 0 && <span className="wb-muted wb-small">{facts.length} fact{facts.length > 1 ? 's' : ''} added by you</span>}
            </div>
            {gaps.length === 0 && <p className="wb-muted wb-pad">Every requirement is covered.</p>}
            {gaps.map((g) => {
              const tr = triage[g.requirement];
              const decided = decisions[g.requirement];
              return (
                <button key={g.requirement} className={`wb-gap${selected === g.requirement ? ' is-active' : ''}${decided ? ' is-decided' : ''}`} onClick={() => setSelected(g.requirement)}>
                  <span className={`wb-dot wb-dot-${g.verdict ?? 'error'}`} />
                  <span className="wb-gap-text">{clip(g.requirement, 118)}</span>
                  <span className="wb-gap-tags">
                    {decided ? <span className="wb-tag">Accepted gap</span> : tr ? <span className={`wb-tag wb-tag-${tr.kind}`}>{KIND_LABEL[tr.kind]}</span> : null}
                  </span>
                </button>
              );
            })}
            <button className={`wb-gap wb-gap-kw${selected === KEYWORDS_ID ? ' is-active' : ''}`} onClick={() => setSelected(KEYWORDS_ID)}>
              <span className="wb-dot wb-dot-partial" />
              <span className="wb-gap-text">Missing keywords ({kwMissing.length})</span>
            </button>
          </aside>

          <div className="wb-detail">
            {selected === KEYWORDS_ID && (
              <div className="wb-card">
                <div className="wb-kicker">Missing keywords</div>
                <p className="wb-muted">Terms from the job description that don’t appear in your resume. Only add one where it is true of you, inside a bullet that shows the work. Never as a list.</p>
                <div className="wb-kw">
                  {kwMissing.length === 0 && <span className="wb-muted">None.</span>}
                  {kwMissing.map((k) => {
                    const sup = kwSupport?.supportable.includes(k);
                    const uns = kwSupport?.unsupported.includes(k);
                    return <span key={k} className={`wb-kwtag${sup ? ' is-sup' : uns ? ' is-uns' : ''}`} title={sup ? 'Appears in your verified facts' : uns ? 'Not in your verified facts' : 'Run triage to classify'}>{k}</span>;
                  })}
                </div>
                {kwSupport && <p className="wb-muted wb-small">Green: already in your verified facts, so it can be worked into a bullet. Grey: not in your facts; leave it out unless you really have it.</p>}
              </div>
            )}

            {!selected && <div className="wb-card wb-empty"><strong>Pick a gap on the left.</strong><p className="wb-muted">Start with the ones Claude marks <em>Reword</em>. They are the quickest honest wins.</p></div>}

            {sel && (
              <div className="wb-card">
                <div className="wb-head-row">
                  <span className={`wb-chip wb-verdict-${sel.verdict ?? 'error'}`}>{sel.verdict ?? 'judge error'}</span>
                  {t && <span className={`wb-tag wb-tag-${t.kind}`}>{KIND_LABEL[t.kind]}</span>}
                  {decisions[sel.requirement] && <span className="wb-tag">Accepted gap</span>}
                </div>
                <h2 className="wb-req">{sel.requirement}</h2>

                <div className="wb-sec">
                  <div className="wb-kicker">What your resume says today</div>
                  <blockquote className="wb-quote">{sel.evidence ?? 'Nothing in the resume matches this yet.'}</blockquote>
                  {sel.reason && <p className="wb-muted wb-small">{JUDGE_LABEL[report.method]}: {sel.reason}</p>}
                  {sel.error && <p className="wb-warn wb-small">{sel.error}</p>}
                </div>

                <div className="wb-sec wb-ai">
                  <div className="wb-kicker">Claude</div>
                  {t && !proposal && <p>{t.reason}</p>}

                  {!proposal && (
                    <button className="wb-btn wb-btn-primary" onClick={() => propose(sel)} disabled={busy.propose !== null || busy.validate}>
                      {busy.propose === sel.requirement ? 'Claude is working on it…' : t?.kind === 'needs-fact' ? 'Ask Claude how to approach it' : 'Ask Claude to close this gap'}
                    </button>
                  )}

                  {proposal?.kind === 'rephrase' && proposal.edit && (() => {
                    const edit = proposal.edit;
                    const draft = drafts[sel.requirement] ?? edit.after;
                    const edited = draft !== edit.after;
                    const fc = proposal.factCheck;
                    const label = isAppendPath(edit.path) && baseData ? appendLabel(baseData, overrides, edit.path) : targets.find((x) => x.path === edit.path)?.label ?? edit.path;
                    return (
                      <div className="wb-proposal">
                        <p>{proposal.explanation}</p>
                        <div className="wb-diff-label">{label}</div>
                        {edit.before && <div className="wb-before"><span>Now</span>{edit.before}</div>}
                        <div className="wb-after-wrap">
                          <span>Proposed</span>
                          <textarea className="wb-input wb-after" rows={Math.min(8, Math.max(3, Math.ceil(draft.length / 80)))} value={draft} onChange={(e) => setDrafts((d) => ({ ...d, [sel.requirement]: e.target.value }))} />
                        </div>
                        <div className={`wb-fact ${fc?.passed && !edited ? 'is-pass' : 'is-fail'}`}>
                          {edited ? 'You edited this text. Re-check it before accepting.' : fc?.passed ? 'Fact-check passed: every claim traces to your verified facts.' : 'Blocked by the fact-check:'}
                          {!edited && fc && !fc.passed && <ul>{fc.issues.map((i) => <li key={i}>{i}</li>)}</ul>}
                        </div>
                        <div className="wb-actions">
                          {edited ? (
                            <button className="wb-btn wb-btn-primary" onClick={() => recheck(sel.requirement, proposal, draft)} disabled={busy.check}>{busy.check ? 'Checking…' : 'Re-check my edit'}</button>
                          ) : (
                            <button className="wb-btn wb-btn-primary" onClick={() => accept(sel.requirement, proposal)} disabled={!fc?.passed || busy.validate}>
                              {busy.validate ? `Re-scoring with ${JUDGE_LABEL[judgePref.current ?? report.method]}…` : `Accept and re-validate with ${JUDGE_LABEL[judgePref.current ?? report.method]}`}
                            </button>
                          )}
                          <button className="wb-btn wb-btn-ghost" onClick={() => setProposals((m) => { const c = { ...m }; delete c[sel.requirement]; return c; })}>Reject</button>
                        </div>
                        <div className="wb-revise">
                          <input className="wb-input" placeholder="Tell Claude what to change (shorter, a different place…)" value={notes[sel.requirement] ?? ''} onChange={(e) => setNotes((n) => ({ ...n, [sel.requirement]: e.target.value }))} />
                          <button className="wb-btn" disabled={!notes[sel.requirement]?.trim() || busy.propose !== null} onClick={() => propose(sel, { reviewerNote: notes[sel.requirement], candidateFact: proposal.candidateFact })}>Revise</button>
                        </div>
                      </div>
                    );
                  })()}

                  {proposal && proposal.kind === 'needs-fact' && (
                    <div className="wb-proposal">
                      <p>{proposal.explanation}</p>
                      {(proposal.question ?? t?.question) && <div className="wb-question">{proposal.question ?? t?.question}</div>}
                      <textarea className="wb-input" rows={4} placeholder="Answer with what is actually true: where, what you did, how often. Leave it empty if you don’t have it." value={answers[sel.requirement] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [sel.requirement]: e.target.value }))} />
                      <div className="wb-actions">
                        <button className="wb-btn wb-btn-primary" disabled={!answers[sel.requirement]?.trim() || busy.propose !== null} onClick={() => propose(sel, { candidateFact: answers[sel.requirement] })}>
                          {busy.propose === sel.requirement ? 'Drafting…' : 'Draft from my answer'}
                        </button>
                        <button className="wb-btn wb-btn-ghost" onClick={() => { setDecisions((d) => ({ ...d, [sel.requirement]: 'gap' })); setProposals((m) => { const c = { ...m }; delete c[sel.requirement]; return c; }); }}>I don’t have this: accept the gap</button>
                      </div>
                      <p className="wb-muted wb-small">Your answer is treated as true and becomes part of this resume. It will also be saved to your verified facts when you save the page.</p>
                    </div>
                  )}

                  {proposal && proposal.kind === 'true-gap' && (
                    <div className="wb-proposal">
                      <p>{proposal.explanation}</p>
                      <p className="wb-muted wb-small">Nothing should be added for this one. If that’s right, accept it and move on.</p>
                      <div className="wb-actions">
                        <button className="wb-btn wb-btn-primary" onClick={() => { setDecisions((d) => ({ ...d, [sel.requirement]: 'gap' })); setProposals((m) => { const c = { ...m }; delete c[sel.requirement]; return c; }); }}>Accept this gap</button>
                        <button className="wb-btn wb-btn-ghost" onClick={() => setProposals((m) => { const c = { ...m }; delete c[sel.requirement]; return c; })}>Dismiss</button>
                      </div>
                    </div>
                  )}

                  {decisions[sel.requirement] && !proposal && (
                    <button className="wb-btn wb-btn-ghost wb-mt" onClick={() => setDecisions((d) => { const c = { ...d }; delete c[sel.requirement]; return c; })}>Reopen this gap</button>
                  )}
                </div>
              </div>
            )}

            {facts.length > 0 && (
              <div className="wb-card wb-facts">
                <div className="wb-kicker">Facts you added in this session</div>
                <ul>
                  {facts.map((f) => (<li key={f.at}><span className="wb-muted">For “{clip(f.requirement, 60)}”:</span> {f.fact}</li>))}
                </ul>
                <p className="wb-muted wb-small">These came from you, not from Claude. Also add them to docs/career/ so future resumes reuse them.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
