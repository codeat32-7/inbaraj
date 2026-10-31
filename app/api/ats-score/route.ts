import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { loadBase, loadProfile } from '@/lib/resume';
import { scoreAts, JudgeKind } from '@/lib/ats';
import { jevAvailable } from '@/lib/jev';
import { claudeAvailable } from '@/lib/claude-judge';
import { resolveModel } from '@/lib/models';

const MAX_JD_CHARS = 20_000;
const MAX_OVERRIDES_CHARS = 200_000;
const SLUG_PATTERN = /^[a-z0-9-]{1,120}$/;
const JUDGES: JudgeKind[] = ['auto', 'jev', 'claude', 'heuristic'];

/**
 * POST { jobDescription, overrides? | slug?, judge?, model? }
 *  - `overrides`: an unsaved/generated override object (review step).
 *  - `slug`: 'base' or a published profile slug (ATS validator page).
 *  - `judge`: 'auto' (default; Jev if configured, else heuristic), or force 'jev' / 'claude' / 'heuristic'.
 */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { name: 'ats-score', limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const unauthorized = await requireAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { jobDescription, overrides, slug, judge = 'auto', model } = body ?? {};

    if (typeof jobDescription !== 'string' || jobDescription.trim().length === 0) {
      return NextResponse.json({ error: 'jobDescription is required' }, { status: 400 });
    }
    if (jobDescription.length > MAX_JD_CHARS) {
      return NextResponse.json({ error: 'Input too large' }, { status: 413 });
    }
    if (!JUDGES.includes(judge)) {
      return NextResponse.json({ error: 'Invalid judge' }, { status: 400 });
    }
    if (judge === 'jev' && !jevAvailable()) {
      return NextResponse.json({ error: 'Jev is not configured: TYPESAFE_API_KEY is not set for this deployment.' }, { status: 400 });
    }
    if (judge === 'claude' && !claudeAvailable()) {
      return NextResponse.json({ error: 'Claude is not configured: ANTHROPIC_API_KEY is not set for this deployment.' }, { status: 400 });
    }

    let resolved: Record<string, unknown>;
    if (slug !== undefined) {
      if (typeof slug !== 'string' || (slug !== 'base' && !SLUG_PATTERN.test(slug))) {
        return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
      }
      if (slug === 'base') {
        resolved = {};
      } else {
        const profile = await loadProfile(slug);
        if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        const { meta: _meta, ...rest } = profile as unknown as Record<string, unknown>;
        void _meta;
        resolved = rest;
      }
    } else if (typeof overrides === 'object' && overrides !== null && !Array.isArray(overrides)) {
      if (JSON.stringify(overrides).length > MAX_OVERRIDES_CHARS) {
        return NextResponse.json({ error: 'Input too large' }, { status: 413 });
      }
      resolved = overrides as Record<string, unknown>;
    } else {
      return NextResponse.json({ error: 'Provide either slug or overrides' }, { status: 400 });
    }

    const report = await scoreAts(loadBase(), resolved, jobDescription, {
      judge,
      model: resolveModel(model),
    });
    return NextResponse.json(report);
  } catch (error) {
    console.error('ATS score error:', error);
    return NextResponse.json({ error: 'Scoring failed' }, { status: 500 });
  }
}
