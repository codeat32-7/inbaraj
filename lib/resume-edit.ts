/**
 * Pure helpers for editing resume text by path. No fs / network, so they run in the
 * browser (ATS workbench) and on the server (ats-fix API) with identical results.
 *
 * Editable path grammar (anything else is rejected):
 *   hero.description                     the PDF "Professional Summary"
 *   experience.<i>.bullets.<j>           a headline bullet            (".+" appends a new bullet)
 *   experience.<i>.highlights.<j>.text   a card's text
 *   skills.<i>.items.<j>                 a skills-table line          (".+" appends a new line)
 */
import type { ResumeData } from './types';

type AnyObj = Record<string, unknown>;

export interface EditTarget {
  path: string;
  label: string;
  text: string;
}

const PATTERNS: RegExp[] = [
  /^hero\.description$/,
  /^experience\.\d+\.bullets\.(\d+|\+)$/,
  /^experience\.\d+\.highlights\.\d+\.text$/,
  /^skills\.\d+\.items\.(\d+|\+)$/,
];

export function isEditablePath(path: string): boolean {
  return PATTERNS.some((p) => p.test(path));
}

export function isAppendPath(path: string): boolean {
  return path.endsWith('.+');
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

function arrayFor(key: 'experience' | 'skills', base: ResumeData, ov: AnyObj): unknown[] | null {
  const v = (ov[key] ?? (base as unknown as AnyObj)[key]) as unknown;
  return Array.isArray(v) ? (v as unknown[]) : null;
}

/** Every text location the workbench is allowed to edit, with its current text. */
export function getTargets(base: ResumeData, ov: AnyObj): EditTarget[] {
  const out: EditTarget[] = [];
  const hero = { ...(base.hero as unknown as AnyObj), ...((ov.hero as AnyObj) ?? {}) };
  if (typeof hero.description === 'string') {
    out.push({ path: 'hero.description', label: 'Professional summary', text: hero.description });
  }
  const exp = arrayFor('experience', base, ov) as
    | { company: string; bullets: string[]; highlights: { label: string; text: string }[] }[]
    | null;
  exp?.forEach((e, i) => {
    e.bullets.forEach((b, j) => out.push({ path: `experience.${i}.bullets.${j}`, label: `${e.company} · bullet ${j + 1}`, text: b }));
    e.highlights.forEach((h, j) => out.push({ path: `experience.${i}.highlights.${j}.text`, label: `${e.company} · card “${h.label}”`, text: h.text }));
  });
  const skills = arrayFor('skills', base, ov) as { title: string; items: string[] }[] | null;
  skills?.forEach((g, i) => g.items.forEach((it, j) => out.push({ path: `skills.${i}.items.${j}`, label: `Skills · ${g.title}`, text: it })));
  return out;
}

export function getCurrentText(base: ResumeData, ov: AnyObj, path: string): string | null {
  if (!isEditablePath(path) || isAppendPath(path)) return null;
  return getTargets(base, ov).find((t) => t.path === path)?.text ?? null;
}

/** Index of the experience item / skills group an append path refers to, plus a label. */
export function appendLabel(base: ResumeData, ov: AnyObj, path: string): string {
  const m = path.match(/^(experience|skills)\.(\d+)\./);
  if (!m) return 'new line';
  const arr = arrayFor(m[1] as 'experience' | 'skills', base, ov) as { company?: string; title?: string }[] | null;
  const item = arr?.[Number(m[2])];
  return m[1] === 'experience' ? `${item?.company ?? 'role'} · new bullet` : `Skills · ${item?.title ?? 'group'} · new line`;
}

/**
 * Returns a new overrides object with the edit applied (the input is never mutated).
 * Editing the summary also mirrors `summary`, which feeds the ATS scorer.
 */
export function applyTextEdit(base: ResumeData, ov: AnyObj, path: string, after: string): AnyObj {
  if (!isEditablePath(path)) throw new Error(`Path not editable: ${path}`);
  const next: AnyObj = clone(ov);

  if (path === 'hero.description') {
    next.hero = { ...((next.hero as AnyObj) ?? {}), description: after };
    next.summary = after;
    return next;
  }

  const [section, idxStr, ...rest] = path.split('.');
  const key = section as 'experience' | 'skills';
  const arr = clone(arrayFor(key, base, ov)) as AnyObj[] | null;
  const i = Number(idxStr);
  if (!arr || !arr[i]) throw new Error(`Nothing at ${path}`);

  if (key === 'experience' && rest[0] === 'bullets') {
    const list = arr[i].bullets as string[];
    if (rest[1] === '+') list.push(after);
    else list[Number(rest[1])] = after;
  } else if (key === 'experience' && rest[0] === 'highlights') {
    const h = (arr[i].highlights as AnyObj[])[Number(rest[1])];
    if (!h) throw new Error(`Nothing at ${path}`);
    h.text = after;
  } else if (key === 'skills') {
    const list = arr[i].items as string[];
    if (rest[1] === '+') list.push(after);
    else list[Number(rest[1])] = after;
  }
  next[key] = arr;
  return next;
}
