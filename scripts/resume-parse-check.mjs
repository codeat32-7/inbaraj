#!/usr/bin/env node
// Machine-readability check for a resume PDF (see .claude/skills/resume-craft/references/ats-parsing.md).
// Usage: node scripts/resume-parse-check.mjs <file.pdf> [slug | base]
// Needs poppler-utils (pdftotext, pdfimages, pdfinfo). Exits 1 on any FAIL.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [pdf, slug = 'base'] = process.argv.slice(2);
if (!pdf) {
  console.error('Usage: node scripts/resume-parse-check.mjs <file.pdf> [slug | base]');
  process.exit(2);
}
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) {
    console.error(`${cmd} is required: ${r.error.message}`);
    process.exit(2);
  }
  return r.stdout;
};
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf-8'));
const base = read('data/base.json');
const over = slug === 'base' ? {} : read(`data/profiles/${slug}.json`);
const r = { ...base, ...Object.fromEntries(Object.entries(over).filter(([k]) => k !== 'meta')) };
if (over.hero) r.hero = { ...base.hero, ...over.hero };
if (over.personal) r.personal = { ...base.personal, ...over.personal };

const fails = [];
const warns = [];
const strip = (s) => String(s ?? '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '');
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9$%~]+/g, '');

const raw = run('pdftotext', ['-raw', pdf, '-']);
const def = run('pdftotext', [pdf, '-']);
if (raw.trim().length < 200) fails.push('Almost no extractable text: the PDF looks image-only or empty.');

// 1. reading-order integrity
const items = [];
for (const e of r.experience || []) {
  (e.bullets || []).forEach((b) => items.push(['bullet', strip(b)]));
  (e.highlights || []).forEach((h) =>
    String(h.text).split('\n').filter((l) => l.trim()).forEach((l) => items.push(['card', strip(l.replace(/^-\s*/, ''))])),
  );
}
items.push(['summary', strip(r.hero.description)]);
for (const g of r.skills || []) g.items.forEach((i) => items.push(['skill', strip(i)]));
for (const c of r.customSections || []) c.items.forEach((i) => items.push(['custom', strip(i)]));
for (const [label, text] of [['raw', raw], ['default', def]]) {
  const t = norm(text);
  const broken = items.filter(([, s]) => !t.includes(norm(s)));
  console.log(`Reading order (${label}): ${items.length - broken.length}/${items.length} items intact`);
  if (broken.length) {
    fails.push(`${broken.length} item(s) broken or reordered in ${label} extraction, e.g. [${broken[0][0]}] "${broken[0][1].slice(0, 70)}…"`);
  }
}

// 2. contact in the body (first 15 lines)
const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
const head = lines.slice(0, 15).join(' ');
if (!/\S+@\S+\.\S+/.test(head)) fails.push('Email not found in the first lines of extracted text.');
if (!/\+?\d[\d\s().-]{7,}\d/.test(head)) fails.push('Phone number not found in the first lines of extracted text.');
if (!head.toLowerCase().includes(String(r.personal.name).toLowerCase())) fails.push('Name not found in the first lines of extracted text.');

// 3. standard headings
const text = raw.toUpperCase();
const need = [['SUMMARY', /\bSUMMARY\b/], ['EXPERIENCE', /\bEXPERIENCE\b/], ['SKILLS', /\bSKILLS\b/], ['EDUCATION', /\bEDUCATION\b/]];
for (const [n, re] of need) if (!re.test(text)) fails.push(`Standard heading "${n}" not found.`);
const idx = (re) => text.search(re);
const order = need.map(([, re]) => idx(re));
if (order.some((i) => i < 0)) {
  /* already reported */
} else if (!(order[0] < order[1] && order[1] < order[2] && order[2] < order[3])) {
  warns.push('Headings are not in the order Summary → Experience → Skills → Education.');
}

// 4–6. titles, companies, dates
const abbr = /\b(Sr|Jr|Mgr|Exec|Dir|Eng|Asst|Assoc|Admin)\b\.?/;
const monYr = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\s*[—–-]\s*((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|Present)$/i;
const rawNorm = norm(raw);
for (const e of r.experience || []) {
  const employer = e.legalName ?? e.company;
  if (abbr.test(e.title)) fails.push(`${e.company}: title "${e.title}" contains an abbreviation; use the full words.`);
  if (!monYr.test(e.period.trim())) fails.push(`${e.company}: period "${e.period}" is not "Mon YYYY — Mon YYYY | Present".`);
  if (!rawNorm.includes(norm(e.period))) fails.push(`${e.company}: date range not found in extracted text.`);
  if (!/\b(Inc|Co|Ltd|LTD|LLC|Corp|GmbH|Pvt|Limited)\b\.?/.test(employer)) {
    warns.push(`${e.company}: no identifying suffix (Inc./Co./Ltd/LLC). Greenhouse lists this as a parse risk; use the legal name if Inbaraj confirms it.`);
  }
}

// 7. file
const size = fs.statSync(pdf).size;
console.log(`File: ${(size / 1024).toFixed(0)} KB`);
if (size > 2.5 * 1024 * 1024) fails.push('File is over 2.5 MB; Greenhouse cannot parse it.');
const imgs = run('pdfimages', ['-list', pdf]).split('\n').slice(2).filter((l) => l.trim()).length;
if (imgs) warns.push(`${imgs} embedded image(s) found; images are not parsed and photos/graphics are a Greenhouse failure cause.`);

// 8. letter spacing
const spaced = raw.match(/(?:\b[A-Za-z]\s){5,}[A-Za-z]\b/g);
if (spaced) fails.push(`Letter-spaced text found (parser reads separate letters): "${spaced[0].trim()}"`);

// 9. first content order: figures before the summary?
const iSum = text.indexOf('SUMMARY');
const firstFigure = raw.search(/\$\d|~\$\d/);
if (iSum >= 0 && firstFigure >= 0 && firstFigure < iSum) {
  warns.push('Stat/figure text is read before the Summary: the first content a parser sees is not your summary or experience.');
}

console.log('');
for (const f of fails) console.log('FAIL  ' + f);
for (const w of warns) console.log('warn  ' + w);
if (!fails.length && !warns.length) console.log('OK    no structural parse risks found');
console.log('\nThis check finds structural risks only. It does not prove a real ATS will parse the file.');
process.exit(fails.length ? 1 : 0);
