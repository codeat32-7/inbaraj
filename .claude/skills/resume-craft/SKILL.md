---
name: resume-craft
description: How to write and edit Inbaraj B's resume content (data/base.json and data/profiles/*.json). Use whenever drafting, tailoring, or reviewing resume copy — summary, bullets, skills — or before shipping any tailored page/PDF. Covers the writing rules, the fact rules, the 2-page PDF budget, and the lint command.
---

# Resume craft

A resume is read in ~10 seconds by someone who is screening, not reading. Every line must earn its space: **scope, numbers, outcome.** No narration, no filler, no repetition.

## Where the text actually shows up
- The PDF's **"Professional Summary" is `hero.description`** (not the `summary` field). On the web page it is also the hero paragraph. Keep `summary` identical in meaning; it feeds the ATS scorer.
- `experience[].bullets` = headline bullets; `highlights` = cards (Problem / Solution / Impact).
- `skills[]` = the skills table. `customSections` render only if they earn their space (a section that adds 0 ATS score and repeats other sections gets deleted).
- The PDF is **2 pages** (`components/ResumePrint.tsx`). A third page with only Education on it is a failure. Trim in this order: repeated custom sections → card detail sentences → bullet tails → summary.

## The summary (hero.description) — hard rules
- **2–3 lines on the PDF: ≤ 340 characters, ≤ 55 words.**
- Lead with *who + scope + numbers*: the kind of customers (e.g. mid-market to enterprise), the figures, the regions, the signature work. Numbers are attributed to the company they came from.
- **Never** say what the resume is for: no "Applying for…", no role title, no company name, no "seeking/looking for". The reader already knows.
- No location (the contact line has it), no "passionate / results-driven / proven / dynamic", no years-of-experience counts, no list of adjectives.
- One differentiator at the end (e.g. builds the AI agents that make implementations repeatable). Stop.

## Bullets
- Verb first. One idea per bullet. **≤ 2 lines (~250 characters).**
- Pattern: *did what → at what scale → with what result.* Put the number in the bullet, not in a separate sentence.
- 4–5 bullets for the current role, 3–4 for older ones. Cut the weakest, don't shrink the font.
- Do not restate a card's content in a bullet.

## Skills table
- Group by what a screener looks for. Each line says **what was done**, not just tool names.
- Specific work gets its own lines (e.g. data transformation: what comes in, what it becomes, where it goes). Don't bury it in a tool list.
- **Mention each tool once** where it is strongest (e.g. SQL once in Data & Analysis, once in the Amazon bullet it belongs to). If a term shows up 3+ times across summary, bullets and skills, cut the extras.

## Language
- Mirror the job description's terms **only where they are true** of Inbaraj. Reuse its nouns (process mapping, implementation plans, go-live, onboarding) rather than inventing synonyms.
- Customer segment: "mid-market to enterprise" (Inbaraj's wording), not "mid-to-large".
- No "N years" phrasing anywhere. No revenue figures for other companies. Dollar amounts stay with the company they came from.

## Facts — non-negotiable
- Source of truth: `data/base.json`, `data/ground-truth.json`, `docs/career/*.md` (esp. `metrics.md`, `skills-and-regions.md`). Inbaraj is the authority on his own career: if he gives a new fact, record it in all three places first, then use it.
- Reword, reorder, re-emphasise. Never invent a skill, metric, tool, region, or client. Every number in a tailored page must exist in the base resume.
- A requirement he does not meet stays a gap. Report it; never paper over it to lift a score. Known gaps: variable-compensation *framework* knowledge/comp-plan design, Python, certifications.
- **Never** put his own variable-pay plan, pay structure, or salary on a resume or cover note.

## Process
1. Read the JD. List each requirement as covered / partial / gap against the facts.
2. Draft: summary → bullets → skills. Use the JD's words where true.
3. `node scripts/resume-lint.mjs <slug>` — fix every FAIL; read the WARNs.
4. Render the PDF (print CSS) and confirm **2 pages**; look at both pages.
5. Score with the repo's ATS scorer (`lib/ats.ts`); report the number and the remaining gaps plainly. Never promise a score.

## Self-review before sending
- Could someone get the whole pitch from the first 3 lines?
- Is any claim in the summary also repeated, word for word, below it?
- Does every number trace to the base resume?
- Does the page say anything the reader already knows (the role, the company, the city)? Delete it.
