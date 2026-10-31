import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { loadBase } from '@/lib/resume';
import { scoreAts } from '@/lib/ats';

const MAX_JD_CHARS = 20_000;
const MAX_OVERRIDES_CHARS = 200_000;

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { name: 'ats-score', limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const unauthorized = await requireAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { jobDescription, overrides } = body ?? {};

    if (typeof jobDescription !== 'string' || jobDescription.trim().length === 0) {
      return NextResponse.json({ error: 'jobDescription is required' }, { status: 400 });
    }
    if (jobDescription.length > MAX_JD_CHARS) {
      return NextResponse.json({ error: 'Input too large' }, { status: 413 });
    }
    if (typeof overrides !== 'object' || overrides === null || Array.isArray(overrides)) {
      return NextResponse.json({ error: 'overrides must be an object' }, { status: 400 });
    }
    if (JSON.stringify(overrides).length > MAX_OVERRIDES_CHARS) {
      return NextResponse.json({ error: 'Input too large' }, { status: 413 });
    }

    const report = await scoreAts(loadBase(), overrides as Record<string, unknown>, jobDescription);
    return NextResponse.json(report);
  } catch (error) {
    console.error('ATS score error:', error);
    return NextResponse.json({ error: 'Scoring failed' }, { status: 500 });
  }
}
