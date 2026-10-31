/**
 * Jev (TypeSafe AI) via Vercel AI Gateway — a classifier, not a text generator.
 * Given some state and a fixed set of described options, it returns one option
 * plus a probability for each.
 *
 * API (Vercel AI Gateway "decision" modality):
 *   POST https://ai-gateway.vercel.sh/v1/evaluate
 *   { model: 'typesafe-ai/jev', state, questions: { id: { type: 'choice', instructions, criteria: { option: description } } } }
 *   -> { answers: { id: { type: 'choice', choice, probabilities } } }
 * Docs: https://vercel.com/docs/ai-gateway/modalities/decision
 *
 * Auth: an AI Gateway API key (AI_GATEWAY_API_KEY), or a Vercel OIDC token
 * (VERCEL_OIDC_TOKEN) when one is present in the environment. Note this is a
 * Vercel AI Gateway key, not a TypeSafe console key.
 *
 * Env:
 *   AI_GATEWAY_API_KEY – Vercel AI Gateway key (project env, never committed)
 *   JEV_MODEL          – optional override, default 'typesafe-ai/jev'
 */

const ENDPOINT = 'https://ai-gateway.vercel.sh/v1/evaluate';
const QUESTION_ID = 'answer';

export interface JevResult<C extends string> {
  choice: C;
  /** Probability per allowed choice, 0..1. */
  probabilities: Record<C, number>;
}

export class JevError extends Error {}

function authToken(): string | undefined {
  return process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || undefined;
}

export function jevAvailable(): boolean {
  return Boolean(authToken());
}

/**
 * `criteria` maps each allowed option to a short description of when it applies.
 */
export async function jevClassify<C extends string>(
  instructions: string,
  state: string,
  criteria: Record<C, string>,
  timeoutMs = 8000
): Promise<JevResult<C>> {
  const token = authToken();
  if (!token) throw new JevError('Jev is not configured (no AI Gateway credentials)');

  const options = Object.keys(criteria) as C[];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        model: process.env.JEV_MODEL || 'typesafe-ai/jev',
        state,
        questions: { [QUESTION_ID]: { type: 'choice', instructions, criteria } },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      // Status only — never echo the response body or credentials into errors.
      throw new JevError(`Jev request failed (${res.status})`);
    }
    const json = (await res.json()) as {
      answers?: Record<string, { type?: string; choice?: unknown; probabilities?: Record<string, unknown> }>;
    };
    const answer = json.answers?.[QUESTION_ID];
    if (!answer || answer.type !== 'choice' || !options.includes(answer.choice as C)) {
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
    throw new JevError(e instanceof Error && e.name === 'AbortError' ? 'Jev request timed out' : 'Jev request failed');
  } finally {
    clearTimeout(timer);
  }
}
