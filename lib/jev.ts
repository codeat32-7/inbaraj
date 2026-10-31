/**
 * Jev (TypeSafe AI) — a classifier, not a text generator. Given some state and a
 * fixed set of described options, it returns one option plus a probability for each.
 *
 * Uses the official SDK (`@typesafe-ai/sdk`), which talks to https://api.typesafe.ai
 * with model `jev-latest` by default. Docs: https://docs.typesafe.ai
 *
 * Env:
 *   TYPESAFE_API_KEY – TypeSafe console key (Vercel project env, never committed).
 *                      Must be enabled for Preview as well as Production.
 */
import { choice, TypeSafeClient, type ContentValue } from '@typesafe-ai/sdk';

const QUESTION_ID = 'answer';

export interface JevResult<C extends string> {
  choice: C;
  /** Probability per allowed choice, 0..1. */
  probabilities: Record<C, number>;
}

export class JevError extends Error {}

export function jevAvailable(): boolean {
  return Boolean(process.env.TYPESAFE_API_KEY);
}

let client: TypeSafeClient | null = null;
function getClient(): TypeSafeClient {
  // One retry, 8s per attempt: scoring fans out several calls, so fail fast and fall back.
  client ??= new TypeSafeClient({ timeout: 8000, retry: { maxRetries: 1 } });
  return client;
}

/**
 * `criteria` maps each allowed option to a short description of when it applies.
 * `state` is the structured input the question is asked about.
 */
export async function jevClassify<C extends string>(
  instructions: string,
  state: { [key: string]: ContentValue },
  criteria: Record<C, string>
): Promise<JevResult<C>> {
  if (!jevAvailable()) throw new JevError('Jev is not configured (TYPESAFE_API_KEY is not set)');

  const options = Object.keys(criteria) as C[];
  try {
    const res = await getClient().systemOne({
      state,
      questions: { [QUESTION_ID]: choice(instructions, criteria) },
    });
    const answer = res.answers[QUESTION_ID] as
      | { choice?: unknown; probabilities?: Record<string, unknown> }
      | undefined;
    if (!answer || !options.includes(answer.choice as C)) {
      throw new JevError('Jev returned an unexpected answer');
    }
    const probabilities = {} as Record<C, number>;
    for (const o of options) {
      const p = Number(answer.probabilities?.[o]);
      probabilities[o] = Number.isFinite(p) ? p : 0;
    }
    return { choice: answer.choice as C, probabilities };
  } catch (e) {
    if (e instanceof JevError) throw e;
    // Never surface SDK error text: it can include request details. Name + status only.
    const status = (e as { status?: number })?.status;
    const name = e instanceof Error ? e.constructor.name : 'Error';
    throw new JevError(`Jev request failed (${name}${status ? ` ${status}` : ''})`);
  }
}
