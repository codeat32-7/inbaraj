#!/usr/bin/env node
// Lint a resume page against the writing rules in .claude/skills/resume-craft/SKILL.md.
// Usage: node scripts/resume-lint.mjs <slug | base>
// Exits 1 if any FAIL is found. WARNs are advisory.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const slug = process.argv[2];
if (!slug) {
  console.error('Usage: node scripts/resume-lint.mjs <slug | base>');
  process.exit(2);
}

const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf-8'));
const base = read('data/base.json');
const over = slug === 'base' ? {} : read(`data/profiles/${slug}.json`);
const r = { ...base, ...Object.fromEntries(Object.entries(over).filter(([k]) => k !== 'meta')) };
if (over.hero) r.hero = { ...base.hero, ...over.hero };

const strip = (s) => String(s ?? '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '');
const fails = [];
const warns = [];
const fail = (m) => fails.push(m);
const warn = (m) => warns.push(m);

// --- Summary (PDF "Professional Summary" = hero.description)
const sum = strip(r.hero.description).trim();
const words = sum.split(/\s+/).filter(Boolean).length;
console.log(`Summary: ${sum.length} chars, ${words} words`);
if (sum.length > 430) fail(`Summary is ${sum.length} chars (max 430, ~3-4 lines on the PDF).`);
if (words > 65) fail(`Summary is ${words} words (max 65).`);
const banned = /\b(applying|application|seeking|looking for|passionate|results[- ]driven|proven track record|dynamic|self[- ]starter)\b|\brole at\b/i;
const hit = sum.match(banned);
if (hit) fail(`Summary contains "${hit[0]}": never say what the resume is for, and no filler adjectives.`);
if (/\bbased in\b/i.test(sum)) warn('Summary mentions location; the contact line already has it.');
const sm = strip(r.summary ?? '');
if (sm && banned.test(sm)) warn('`summary` field contains banned phrasing; keep it aligned with hero.description.');

// --- Bullets
const years = /\b\d+\+?\s*(?:years?|yrs?)\b/i;
const all = [];
for (const e of r.experience || []) {
  (e.bullets || []).forEach((b, i) => {
    const t = strip(b);
    all.push(t);
    if (t.length > 270) fail(`${e.company} bullet ${i + 1} is ${t.length} chars (max ~250, 2 lines).`);
    if (years.test(t)) fail(`${e.company} bullet ${i + 1} uses an "N years" phrase.`);
  });
  (e.highlights || []).forEach((h) => all.push(strip(h.text)));
  const n = (e.bullets || []).length;
  if (n > 6) warn(`${e.company} has ${n} bullets; keep 4-5 (3-4 for older roles).`);
}
if (years.test(sum)) fail('Summary uses an "N years" phrase.');

// --- Numbers must exist in the base resume
const baseTxt = JSON.stringify(base);
const body = JSON.stringify({ ...r, meta: undefined });
const nums = new Set(body.match(/~?\$?\d[\d,.]*[KM+%]*/g) || []);
const unknown = [...nums].filter((n) => n.length > 1 && !baseTxt.includes(n.replace(/^~/, '')));
if (unknown.length) fail(`Numbers not found in base.json: ${unknown.join(', ')}`);

// --- Repetition of tool/skill terms across summary + bullets + skills
const skillsTxt = (r.skills || []).flatMap((g) => g.items).map(strip);
const corpus = [sum, ...all, ...skillsTxt].join(' \n ');
const terms = ['SQL', 'Excel', 'Python', 'Salesforce', 'ServiceNow', 'ADP', 'SatMetrix', 'APIs', 'Nitro', 'Atlas', 'RAG', 'Supermemory', 'Browserbase'];
for (const t of terms) {
  const c = (corpus.match(new RegExp(`\\b${t}\\b`, 'g')) || []).length;
  const limit = ['Nitro', 'Atlas', 'Salesforce', 'ServiceNow', 'ADP', 'SatMetrix'].includes(t) ? 4 : 3;
  if (c > limit) warn(`"${t}" appears ${c} times across summary, bullets, cards and skills. Cut the extras.`);
}
if (/\bSQL\b/.test(sum)) warn('SQL in the summary: it belongs in Data & Analysis / the Amazon bullet.');

// --- Custom sections must earn their space
if ((r.customSections || []).length) warn('customSections present: delete them if they repeat the skills/bullets and add no ATS score.');

console.log('');
for (const f of fails) console.log('FAIL  ' + f);
for (const w of warns) console.log('warn  ' + w);
if (!fails.length && !warns.length) console.log('OK    no issues');
process.exit(fails.length ? 1 : 0);
