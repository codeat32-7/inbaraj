import { ResumeData, ProfileOverride } from './types';
import { mergeResume } from './resume';
import { jevAvailable, jevClassify } from './jev';

export type Verdict = 'covered' | 'partial' | 'missing';
const VERDICTS = ['covered', 'partial', 'missing'] as const;
const VERDICT_VALUE: Record<Verdict, number> = { covered: 1, partial: 0.5, missing: 0 };

export interface RequirementResult {
  requirement: string;
  verdict: Verdict;
  confidence: number;
  evidence: string | null;
}

export interface FormatCheck {
  label: string;
  passed: boolean;
}

export interface AtsReport {
  score: number;
  breakdown: { keywords: number; requirements: number; format: number };
  keywords: { matched: string[]; missing: string[] };
  requirements: RequirementResult[];
  checks: FormatCheck[];
  /** 'jev' if the requirement judge ran on Jev, else the keyword-overlap fallback. */
  method: 'jev' | 'heuristic';
  jevError?: string;
}

const WEIGHTS = { keywords: 0.35, requirements: 0.5, format: 0.15 };
const MAX_REQUIREMENTS = 20;
const MAX_KEYWORDS = 25;

const STOPWORDS = new Set(
  (
    'a about above across after all also an and any are as at be been being both but by can could do does done each ' +
    'etc for from has have having how if in into is it its may more most must new no not of on one only or other our ' +
    'out over per such than that the their them then there these they this those through to under up us use using ' +
    'very was we well were what when where which while who will with within without would you your ' +
    'ability able about candidate candidates company role roles position team teams work working works job years year ' +
    'experience experienced strong excellent good great plus preferred required requirements responsibilities ' +
    'qualifications skills skill knowledge understanding including include includes based looking join help ' +
    'build building support supporting manage managing environment opportunity benefits equal employer ' +
    'across within across e.g i.e'
  ).split(/\s+/)
);

export function stripHtml(s: string): string {
  return s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '');
}

function stem(w: string): string {
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith('es')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s')) return w.slice(0, -1);
  return w;
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9+#.]*[a-z0-9+#]|[a-z0-9]/g) ?? []).map(stem);
}

function contentTokens(text: string): string[] {
  return tokenize(text).filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

// ---------- Resume flattening ----------

export function resumeSnippets(r: ResumeData): string[] {
  const out: string[] = [];
  const push = (s?: string) => {
    const t = s ? stripHtml(s).trim() : '';
    if (t) out.push(t);
  };
  push(r.summary);
  push(r.hero?.headline);
  push(r.hero?.description);
  if (r.experience) {
    for (const e of r.experience) {
      push(`${e.title} at ${e.company}`);
      e.bullets.forEach(push);
      e.highlights?.forEach((h) => push(`${h.label}. ${h.text}`));
    }
  }
  if (r.projects) {
    for (const p of r.projects) push(`${p.name}: ${p.description} ${p.tags.join(' ')}`);
  }
  if (r.skills) {
    for (const g of r.skills) push(`${g.title}: ${g.items.join(', ')}`);
  }
  r.education?.forEach((e) => push(`${e.degree}, ${e.university}`));
  r.customSections?.forEach((c) => {
    push(c.title);
    c.items.forEach(push);
  });
  return out;
}

// ---------- JD parsing ----------

export function extractRequirements(jd: string): string[] {
  const lines = jd
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s\-*•·▪●◦–—\d.)]+/, '').trim())
    .filter(Boolean);
  const candidates: string[] = [];
  for (const line of lines) {
    // Long prose lines are split into sentences; short lines are kept whole.
    const parts = line.length > 220 ? line.split(/(?<=[.;!?])\s+/) : [line];
    for (const p of parts) {
      const t = p.trim();
      if (t.length < 15 || t.length > 300) continue;
      if (contentTokens(t).length < 2) continue;
      // Title/heading lines have no connector words; real requirements do.
      if (!/\b(to|with|and|of|in|for|from|across|at|on|using)\b/i.test(t)) continue;
      candidates.push(t);
    }
  }
  // Prefer lines that read like requirements.
  const signal = /\b(experience|proficien|knowledge|familiar|ability|skills?|manage|lead|own|build|design|deliver|implement|integrat|degree|certif|must|required|responsible)/i;
  const ranked = [...candidates].sort((a, b) => Number(signal.test(b)) - Number(signal.test(a)));
  const picked = new Set(ranked.slice(0, MAX_REQUIREMENTS));
  return candidates.filter((c) => picked.has(c));
}

export function extractKeywords(jd: string): string[] {
  const counts = new Map<string, { n: number; bonus: number; display: string }>();
  const add = (key: string, display: string, bonus: number) => {
    const cur = counts.get(key);
    if (cur) {
      cur.n += 1;
      cur.bonus = Math.max(cur.bonus, bonus);
    } else counts.set(key, { n: 1, bonus, display });
  };

  const clauses = jd.split(/[\n,;:()]+|(?<=[.!?])\s+/);
  for (const clause of clauses) {
    const words = clause.match(/[A-Za-z][A-Za-z0-9+#.\-/]*[A-Za-z0-9+#]|[A-Za-z]/g) ?? [];
    const norm = words.map((w) => w.toLowerCase().replace(/[.\-/]+$/, ''));
    const bonus = words.map((w, i) => {
      const acronym = /^[A-Z][A-Z0-9&]+$/.test(w);
      const techy = /[0-9+#]/.test(w) || /[a-z][A-Z]/.test(w);
      const midCap = i > 0 && /^[A-Z][a-z]/.test(w);
      return acronym || techy ? 3 : midCap ? 2 : 0;
    });
    const usable = (i: number) => {
      const lw = norm[i];
      return lw !== undefined && lw.length >= 2 && !STOPWORDS.has(lw) && !STOPWORDS.has(stem(lw));
    };
    words.forEach((w, i) => {
      if (!usable(i)) return;
      add(stem(norm[i]), w, bonus[i]);
      if (usable(i + 1) && norm[i].length > 2 && norm[i + 1].length > 2) {
        add(`${stem(norm[i])} ${stem(norm[i + 1])}`, `${w} ${words[i + 1]}`, Math.min(bonus[i], bonus[i + 1]));
      }
    });
  }

  const ranked = [...counts.entries()]
    .map(([key, v]) => ({ key, display: v.display, n: v.n, weight: v.n + v.bonus, bonus: v.bonus }))
    // Unigrams need to look like a proper noun/tech term, or repeat a lot. Bigrams need both.
    .filter((v) => (v.key.includes(' ') ? v.n >= 2 && v.bonus >= 2 : v.bonus >= 2 || v.n >= 3))
    .sort((a, b) => b.weight - a.weight);

  // Drop a unigram when a kept bigram already contains it.
  const kept: typeof ranked = [];
  for (const v of ranked) {
    if (kept.length >= MAX_KEYWORDS) break;
    if (!v.key.includes(' ') && kept.some((k) => k.key.includes(' ') && k.key.split(' ').includes(v.key))) continue;
    kept.push(v);
  }
  return kept.map((v) => v.display);
}

// ---------- Scoring pieces ----------

function keywordCoverage(keywords: string[], resumeText: string) {
  const hay = ` ${tokenize(resumeText).join(' ')} `;
  const matched: string[] = [];
  const missing: string[] = [];
  for (const k of keywords) {
    const phrase = ` ${tokenize(k).join(' ')} `;
    (hay.includes(phrase) ? matched : missing).push(k);
  }
  const score = keywords.length ? matched.length / keywords.length : 1;
  return { score, matched, missing };
}

function topEvidence(requirement: string, snippets: string[], k = 3): string[] {
  const req = new Set(contentTokens(requirement));
  return snippets
    .map((s) => {
      const toks = new Set(contentTokens(s));
      let hit = 0;
      for (const t of req) if (toks.has(t)) hit += 1;
      return { s, hit };
    })
    .filter((x) => x.hit > 0)
    .sort((a, b) => b.hit - a.hit)
    .slice(0, k)
    .map((x) => x.s);
}

function heuristicJudge(requirement: string, evidence: string[]): { verdict: Verdict; confidence: number } {
  const req = new Set(contentTokens(requirement));
  if (req.size === 0) return { verdict: 'covered', confidence: 0.5 };
  const have = new Set(contentTokens(evidence.join(' ')));
  let hit = 0;
  for (const t of req) if (have.has(t)) hit += 1;
  const ratio = hit / req.size;
  if (ratio >= 0.5) return { verdict: 'covered', confidence: ratio };
  if (ratio >= 0.25) return { verdict: 'partial', confidence: ratio };
  return { verdict: 'missing', confidence: 1 - ratio };
}

const JEV_QUESTION =
  'Does the resume evidence demonstrate the job requirement? "covered" = clearly demonstrated, ' +
  '"partial" = related but not the same, "missing" = not demonstrated.';

async function judge(requirement: string, evidence: string[], useJev: boolean) {
  if (!evidence.length) return { verdict: 'missing' as Verdict, confidence: 1, jev: false };
  if (useJev) {
    const ctx = `Job requirement: ${requirement}\n\nResume evidence:\n- ${evidence.join('\n- ')}`;
    const r = await jevClassify(JEV_QUESTION, ctx, VERDICTS);
    return { verdict: r.choice, confidence: r.probabilities[r.choice] ?? 0, jev: true };
  }
  return { ...heuristicJudge(requirement, evidence), jev: false };
}

function formatChecks(r: ResumeData): FormatCheck[] {
  const exp = r.experience || [];
  return [
    { label: 'Email address present', passed: /\S+@\S+\.\S+/.test(r.personal?.email ?? '') },
    { label: 'Phone number present', passed: Boolean((r.personal?.phone ?? '').replace(/\D/g, '').length >= 7) },
    { label: 'Work experience section present', passed: exp.length > 0 },
    { label: 'Experience entries have dates', passed: exp.length > 0 && exp.every((e) => /\d{4}/.test(e.period)) },
    { label: 'Skills section present', passed: Array.isArray(r.skills) && r.skills.length > 0 },
    { label: 'Education section present', passed: (r.education?.length ?? 0) > 0 },
    { label: 'Professional summary present', passed: stripHtml(r.summary ?? '').trim().length >= 40 },
  ];
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

// ---------- Public API ----------

export async function scoreAts(
  base: ResumeData,
  overrides: Record<string, unknown>,
  jobDescription: string
): Promise<AtsReport> {
  const merged = mergeResume(base, { meta: { company: '', created: '', active: true }, ...overrides } as ProfileOverride);
  const snippets = resumeSnippets(merged);
  const resumeText = snippets.join('\n');

  const kw = keywordCoverage(extractKeywords(jobDescription), resumeText);
  const checks = formatChecks(merged);
  const formatScore = checks.filter((c) => c.passed).length / checks.length;

  const reqs = extractRequirements(jobDescription);
  let useJev = jevAvailable();
  let jevError: string | undefined;
  let jevRan = false;

  const results = await mapLimit(reqs, 5, async (requirement): Promise<RequirementResult> => {
    const evidence = topEvidence(requirement, snippets);
    let j;
    try {
      j = await judge(requirement, evidence, useJev);
    } catch (e) {
      // First Jev failure disables it for the remaining requirements.
      useJev = false;
      jevError = e instanceof Error ? e.message : 'Jev failed';
      j = await judge(requirement, evidence, false);
    }
    if (j.jev) jevRan = true;
    return { requirement, verdict: j.verdict, confidence: Number(j.confidence.toFixed(2)), evidence: evidence[0] ?? null };
  });

  const reqScore = results.length
    ? results.reduce((sum, r) => sum + VERDICT_VALUE[r.verdict], 0) / results.length
    : 1;

  const score = Math.round(
    100 * (kw.score * WEIGHTS.keywords + reqScore * WEIGHTS.requirements + formatScore * WEIGHTS.format)
  );

  return {
    score,
    breakdown: {
      keywords: Math.round(kw.score * 100),
      requirements: Math.round(reqScore * 100),
      format: Math.round(formatScore * 100),
    },
    keywords: { matched: kw.matched, missing: kw.missing },
    requirements: results,
    checks,
    method: jevRan ? 'jev' : 'heuristic',
    ...(jevError ? { jevError } : {}),
  };
}
