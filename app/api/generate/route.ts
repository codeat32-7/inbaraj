import { resolveModel } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';
import { loadBase } from '@/lib/resume';
import { tailorResumeWithValidation } from '@/lib/ai';
import { loadGroundTruth } from '@/lib/ground-truth';
import { generateSlug } from '@/lib/slug';
import { logGeneration } from '@/lib/logger';
import { requireAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

const MAX_JD_CHARS = 20_000;
const MAX_NAME_CHARS = 200;

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { name: 'generate', limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const unauthorized = await requireAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { jobDescription, companyName, roleLabel } = body;

    if (typeof jobDescription !== 'string' || typeof companyName !== 'string') {
      return NextResponse.json(
        { error: 'jobDescription and companyName are required' },
        { status: 400 }
      );
    }
    if (jobDescription.length === 0 || companyName.length === 0) {
      return NextResponse.json(
        { error: 'jobDescription and companyName are required' },
        { status: 400 }
      );
    }
    if (jobDescription.length > MAX_JD_CHARS || companyName.length > MAX_NAME_CHARS) {
      return NextResponse.json({ error: 'Input too large' }, { status: 413 });
    }
    if (roleLabel !== undefined && (typeof roleLabel !== 'string' || roleLabel.length > MAX_NAME_CHARS)) {
      return NextResponse.json({ error: 'Invalid roleLabel' }, { status: 400 });
    }

    const base = loadBase();
    const groundTruth = loadGroundTruth();
    const slug = generateSlug(companyName, roleLabel);

    const startTime = Date.now();
    const { overrides, validation, retryCount } = await tailorResumeWithValidation(
      base,
      jobDescription,
      groundTruth,
      resolveModel(body.model)
    );
    const generationTimeMs = Date.now() - startTime;

    const date = new Date().toISOString().slice(0, 10);

    logGeneration({
      timestamp: new Date().toISOString(),
      slug,
      company: companyName,
      generationTimeMs,
      validationResult: validation,
      retryCount,
    });

    return NextResponse.json({
      slug,
      companyName,
      date,
      overrides,
      validation,
    });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
