import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

const MAX_TEXT_CHARS = 4_000;
const MAX_INSTRUCTION_CHARS = 1_000;

function stripCodeFences(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:\w+)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.trim();
}

const SYSTEM_PROMPT = `You are a resume editing assistant. The user wants to modify a specific field in their resume. Apply the requested change while following these rules:

1. Only modify the text as the user instructs. Don't add fabricated information, skills, or metrics.
2. Maintain professional resume tone and language.
3. Keep approximately the same length unless the user asks for longer/shorter.
4. Preserve any factual claims — only rephrase, restructure, or emphasize as requested.
5. Return ONLY the updated text. No explanation, no JSON wrapping, no surrounding quotes, no markdown.`;

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { name: 'ai-edit', limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const unauthorized = await requireAuth(request);
  if (unauthorized) return unauthorized;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const { currentText, instruction, fieldLabel } = await request.json();

    if (typeof currentText !== 'string' || typeof instruction !== 'string') {
      return NextResponse.json(
        { error: 'currentText and instruction are required' },
        { status: 400 }
      );
    }
    if (currentText.length === 0 || instruction.length === 0) {
      return NextResponse.json(
        { error: 'currentText and instruction are required' },
        { status: 400 }
      );
    }
    if (currentText.length > MAX_TEXT_CHARS || instruction.length > MAX_INSTRUCTION_CHARS) {
      return NextResponse.json({ error: 'Input too large' }, { status: 413 });
    }
    if (fieldLabel !== undefined && (typeof fieldLabel !== 'string' || fieldLabel.length > 200)) {
      return NextResponse.json({ error: 'Invalid fieldLabel' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });

    const userMessage = `## Field being edited
Type: ${fieldLabel || 'Resume field'}

## Current text
${currentText}

## Requested change
${instruction}

Return only the updated text.`;

    const message = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-5-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No response from AI');
    }

    const editedText = stripCodeFences(textBlock.text);

    return NextResponse.json({ editedText });
  } catch (error) {
    console.error('AI edit error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI edit failed' },
      { status: 500 }
    );
  }
}
