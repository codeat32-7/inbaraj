/**
 * Jev (TypeSafe AI) client — a classifier, not a text generator.
 * Given a question, some context and a fixed list of allowed answers, it
 * returns one of the answers plus a probability for each.
 *
 * !! UNVERIFIED API SHAPE !!
 * The request/response format below was written without access to TypeSafe's
 * docs. It is isolated in this one file on purpose. Before relying on it, check
 * it against the example in the TypeSafe console and adjust `buildBody` /
 * `parseResponse`. Until `TYPESAFE_API_URL` is set, `jevAvailable()` is false
 * and callers fall back to their heuristic path.
 *
 * Env:
 *   TYPESAFE_API_KEY  – API key (Vercel project env, never committed)
 *   TYPESAFE_API_URL  – full endpoint URL for the classify call
 *   TYPESAFE_MODEL    – optional model id
 */

export interface JevResult<C extends string> {
  choice: C;
  /** Probability per allowed choice, 0..1. */
  probabilities: Record<C, number>;
}

export class JevError extends Error {}

export function jevAvailable(): boolean {
  return Boolean(process.env.TYPESAFE_API_KEY && process.env.TYPESAFE_API_URL);
}

function buildBody(question: string, context: string, choices: readonly string[]) {
  return {
    model: process.env.TYPESAFE_MODEL || undefined,
    question,
    context,
    choices,
  };
}

function parseResponse<C extends string>(json: unknown, choices: readonly C[]): JevResult<C> {
  const obj = (json ?? {}) as Record<string, unknown>;
  const rawProbs = (obj.probabilities ?? obj.probs ?? {}) as Record<string, unknown>;
  const probabilities = {} as Record<C, number>;
  for (const c of choices) {
    const p = Number(rawProbs[c]);
    probabilities[c] = Number.isFinite(p) ? p : 0;
  }
  const choice = obj.choice as C;
  if (!choices.includes(choice)) throw new JevError('Jev returned an unexpected choice');
  return { choice, probabilities };
}

export async function jevClassify<C extends string>(
  question: string,
  context: string,
  choices: readonly C[],
  timeoutMs = 8000
): Promise<JevResult<C>> {
  const key = process.env.TYPESAFE_API_KEY;
  const url = process.env.TYPESAFE_API_URL;
  if (!key || !url) throw new JevError('Jev is not configured');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(buildBody(question, context, choices)),
      signal: controller.signal,
    });
    if (!res.ok) throw new JevError(`Jev request failed (${res.status})`);
    return parseResponse(await res.json(), choices);
  } catch (e) {
    if (e instanceof JevError) throw e;
    throw new JevError(e instanceof Error ? e.message : 'Jev request failed');
  } finally {
    clearTimeout(timer);
  }
}
