import { resolveModel } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';
import { loadBase, loadProfile, mergeResume } from '@/lib/resume';
import { loadGroundTruth } from '@/lib/ground-truth';
import { generateSlug } from '@/lib/slug';
import { logGeneration } from '@/lib/logger';
import { adaptResumeWithValidation } from '@/lib/ai';
import { requireAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

const MAX_INSTRUCTION_CHARS = 5_000;
const MAX_NAME_CHARS = 200;
const SLUG_PATTERN = /^[a-z0-9-]{1,120}$/;

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { name: 'adapt', limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const unauthorized = await requireAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { sourceSlug, companyName, roleLabel, instruction } = body;

    if (typeof instruction !== 'string' || instruction.length === 0) {
      return NextResponse.json({ error: 'instruction is required' }, { status: 400 });
    }
    if (instruction.length > MAX_INSTRUCTION_CHARS) {
      return NextResponse.json({ error: 'instruction too long' }, { status: 413 });
    }

    const hasCompany = typeof companyName === 'string' && companyName.length > 0;
    const hasRole = typeof roleLabel === 'string' && roleLabel.length > 0;
    if (!hasCompany && !hasRole) {
      return NextResponse.json(
        { error: 'Either companyName or roleLabel is required' },
        { status: 400 }
      );
    }
    if (hasCompany && companyName.length > MAX_NAME_CHARS) {
      return NextResponse.json({ error: 'companyName too long' }, { status: 413 });
    }
    if (hasRole && roleLabel.length > MAX_NAME_CHARS) {
      return NextResponse.json({ error: 'roleLabel too long' }, { status: 413 });
    }
    if (sourceSlug !== undefined && (typeof sourceSlug !== 'string' || !SLUG_PATTERN.test(sourceSlug))) {
      return NextResponse.json({ error: 'Invalid sourceSlug' }, { status: 400 });
    }

    const base = loadBase();
    const groundTruth = loadGroundTruth();

    const isDefaultVariant = !hasCompany;
    const slug = isDefaultVariant
      ? `d-${generateSlug(roleLabel!)}`
      : generateSlug(companyName, roleLabel);
    const displayName = isDefaultVariant ? roleLabel! : companyName;

    let sourceResume = base;
    if (sourceSlug) {
      const profile = await loadProfile(sourceSlug);
      if (profile) {
        sourceResume = mergeResume(base, profile);
      }
    }

    const startTime = Date.now();
    const { overrides, validation, retryCount } = await adaptResumeWithValidation(
      sourceResume,
      instruction,
      groundTruth,
      resolveModel(body.model)
    );
    const generationTimeMs = Date.now() - startTime;

    const date = new Date().toISOString().slice(0, 10);

    logGeneration({
      timestamp: new Date().toISOString(),
      slug,
      company: displayName,
      generationTimeMs,
      validationResult: validation,
      retryCount,
    });

    return NextResponse.json({
      slug,
      companyName: displayName,
      date,
      overrides,
      validation,
    });
  } catch (error) {
    console.error('Adapt error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Adaptation failed' },
      { status: 500 }
    );
  }
}
