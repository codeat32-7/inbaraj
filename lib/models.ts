export const CLAUDE_MODELS = [
  { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5', hint: 'Balanced (default)' },
  { id: 'claude-opus-5-5', label: 'Opus 5.5', hint: 'Highest quality, slower' },
  { id: 'claude-fable-5-1', label: 'Fable 5.1', hint: 'Most capable' },
  { id: 'claude-haiku-5-5', label: 'Haiku 5.5', hint: 'Fastest, cheapest' },
] as const;

export const DEFAULT_MODEL: string = process.env.CLAUDE_MODEL || CLAUDE_MODELS[0].id;

export function resolveModel(value: unknown): string {
  return CLAUDE_MODELS.some((m) => m.id === value) ? (value as string) : DEFAULT_MODEL;
}
