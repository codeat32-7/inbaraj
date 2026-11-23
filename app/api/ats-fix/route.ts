import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { loadBase, loadProfile } from '@/lib/resume';
import { loadGroundTruth } from '@/lib/ground-truth';
import { resolveModel } from '@/lib/models';
import { getTargets, getCurrentText, isAppendPath, isEditablePath } from '@/lib/resume-edit';
import { factCheck, keywordSupport, localChecks, proposeEdit, triageGaps } from '@/lib/ats-fix';

const MAX_JD_CHARS = 20_000;
const MAX_OVERRIDES_CHARS = 200_000;
const SLUG_PATTERN = /^[a-z0-9-]{1,120}$/;
const MODES = ['triage', 'propose', 'check'] as const;

/**
 * POST { mode, jobDescription, overrides? | slug?, model?, ... }
 *  - triage:  { gaps: [{index, requirement, verdict, evidence}], missingKeywords? }
 *  - propose: { requirement, verdict, evidence, candidateFact?, reviewerNote? }
 *  - check:   { path, after, candidateFact? }   (fact-check text the user edited by hand)
 * Claude only rewords verified facts or asks a question; every edit comes back fact-checked.
 */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { name: 'ats-fix', limit: 40, windowMs: 60_000 });
  if (limited) return limited;
  const unauthorized = await requireAuth(request);
  if (unauthorized) return unauthorized;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Claude is not configured: ANTHROPIC_API_KEY is not set.' }, { status: 400 });

  try {
    const body = (await request.json()) ?? {};
    const { mode, jobDescription, overrides, slug } = body;
    if (!MODES.includes(mode)) return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    if (typeof jobDescription !== 'string' || !jobDescription.trim()) {
      return NextResponse.json({ error: 'jobDescription is required' }, { status: 400 });
    }
    if (jobDescription.length > MAX_JD_CHARS) return NextResponse.json({ error: 'Input too large' }, { status: 413 });

    let resolved: Record<string, unknown>;
    if (slug !== undefined) {
      if (typeof slug !== 'string' || (slug !== 'base' && !SLUG_PATTERN.test(slug))) {
        return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
      }
      if (slug === 'base') resolved = {};
      else {
        const profile = await loadProfile(slug);
        if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        const { meta: _meta, ...rest } = profile as unknown as Record<string, unknown>;
        void _meta;
        resolved = rest;
      }
    } else if (overrides && typeof overrides === 'object' && !Array.isArray(overrides)) {
      if (JSON.stringify(overrides).length > MAX_OVERRIDES_CHARS) return NextResponse.json({ error: 'Input too large' }, { status: 413 });
      resolved = overrides as Record<string, unknown>;
    } else {
      return NextResponse.json({ error: 'Provide either slug or overrides' }, { status: 400 });
    }

    const base = loadBase();
    const groundTruth = loadGroundTruth();
    const knownText = JSON.stringify([groundTruth, base]);
    const model = resolveModel(body.model);
    const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 55_000 });
    const targets = getTargets(base, resolved);
    const summary = targets.find((t) => t.path === 'hero.description')?.text ?? '';

    if (mode === 'triage') {
      const gaps = Array.isArray(body.gaps) ? body.gaps.slice(0, 25) : [];
      if (!gaps.length) return NextResponse.json({ items: [], keywordSupport: null });
      const clean = gaps
        .filter((g: unknown): g is { index: number; requirement: string; verdict: string | null; evidence: string | null } => {
          const x = g as Record<string, unknown>;
          return typeof x?.index === 'number' && typeof x?.requirement === 'string';
        })
        .map((g: { index: number; requirement: string; verdict: string | null; evidence: string | null }) => ({
          index: g.index,
          requirement: g.requirement.slice(0, 400),
          verdict: typeof g.verdict === 'string' ? g.verdict : null,
          evidence: typeof g.evidence === 'string' ? g.evidence.slice(0, 500) : null,
        }));
      const items = await triageGaps(client, model, { jobDescription, gaps: clean, groundTruth, summary });
      const missing = Array.isArray(body.missingKeywords) ? body.missingKeywords.filter((k: unknown) => typeof k === 'string').slice(0, 40) : [];
      return NextResponse.json({ items, keywordSupport: keywordSupport(missing, knownText) });
    }

    if (mode === 'check') {
      const { path, after, candidateFact } = body;
      if (typeof path !== 'string' || typeof after !== 'string' || !after.trim()) return NextResponse.json({ error: 'path and after are required' }, { status: 400 });
      const before = getCurrentText(base, resolved, path);
      const local = localChecks({ path, before, after, knownText, candidateFact: typeof candidateFact === 'string' ? candidateFact : undefined });
      const claude = await factCheck(client, model, { before, after, groundTruth, candidateFact: typeof candidateFact === 'string' ? candidateFact : undefined });
      const issues = [...local, ...claude.issues];
      return NextResponse.json({ factCheck: { passed: local.length === 0 && claude.passed, issues, checkedWith: claude.checkedWith } });
    }

    // propose
    const { requirement, verdict, evidence, candidateFact, reviewerNote } = body;
    if (typeof requirement !== 'string' || !requirement.trim()) return NextResponse.json({ error: 'requirement is required' }, { status: 400 });
    const fact = typeof candidateFact === 'string' && candidateFact.trim() ? candidateFact.trim().slice(0, 1500) : undefined;
    const note = typeof reviewerNote === 'string' && reviewerNote.trim() ? reviewerNote.trim().slice(0, 600) : undefined;

    const out = await proposeEdit(client, model, {
      jobDescription,
      requirement: requirement.slice(0, 400),
      verdict: typeof verdict === 'string' ? verdict : null,
      evidence: typeof evidence === 'string' ? evidence.slice(0, 500) : null,
      targets,
      groundTruth,
      candidateFact: fact,
      reviewerNote: note,
    });

    let edit: { path: string; before: string | null; after: string } | null = null;
    let factResult = null as null | { passed: boolean; issues: string[]; checkedWith: string };
    let kind = out.kind;
    let explanation = out.explanation;

    if (kind === 'rephrase' && out.edit) {
      const { path, after } = out.edit;
      const okPath = isEditablePath(path) && (isAppendPath(path) ? Boolean(fact) : targets.some((t) => t.path === path));
      if (!okPath) {
        kind = 'needs-fact';
        explanation = 'Claude pointed at a location that cannot be edited here. Try again, or leave a note about where it should go.';
      } else {
        const before = isAppendPath(path) ? null : getCurrentText(base, resolved, path);
        const local = localChecks({ path, before, after, knownText, candidateFact: fact });
        const claude = await factCheck(client, model, { before, after, groundTruth, candidateFact: fact });
        edit = { path, before, after };
        factResult = { passed: local.length === 0 && claude.passed, issues: [...local, ...claude.issues], checkedWith: claude.checkedWith };
      }
    } else if (kind === 'rephrase') {
      kind = 'needs-fact';
      explanation = explanation || 'Claude did not propose an edit for this gap.';
    }

    return NextResponse.json({ kind, explanation, question: out.question ?? null, edit, factCheck: factResult });
  } catch (error) {
    console.error('ats-fix error:', error);
    let message = 'Claude request failed';
    if (error instanceof Anthropic.AuthenticationError) message = 'Claude authentication failed: check ANTHROPIC_API_KEY.';
    else if (error instanceof Anthropic.RateLimitError) message = 'Claude is rate limited; try again shortly.';
    else if (error instanceof Anthropic.APIConnectionError) message = 'Could not reach Claude.';
    else if (error instanceof SyntaxError || (error instanceof Error && error.name === 'ZodError')) message = 'Claude returned an unusable answer; try again.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
