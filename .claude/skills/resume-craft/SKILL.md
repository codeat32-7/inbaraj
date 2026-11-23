---
name: resume-craft
description: Evidence-based method for writing, tailoring and checking Inbaraj B's resume (data/base.json, data/profiles/*.json, the PDF) so it reads fast for humans and parses cleanly in applicant tracking systems. Use before drafting or editing any resume copy, when asked about ATS, and before shipping any tailored page or PDF. Every rule is tagged with its evidence; sources are in references/evidence.md.
---

# Resume craft

Two readers, in order: **(1) software that parses the file into fields, (2) a person who skims for ~6–8 seconds.** Write for both, never for a score.

Rules carry a tag so you know how much weight they have:
- **[OFFICIAL]** — stated in an ATS vendor's or university career office's own documentation.
- **[STUDY]** — measured in a study (sample and caveats in `references/evidence.md`).
- **[CONSENSUS]** — repeated across many guides; no primary source found.
- **[HOUSE]** — Inbaraj's own preference. Follow it, but don't present it as industry fact.

Full source notes, what was *not* verified, and the ATS mechanics: `references/evidence.md`, `references/ats-parsing.md`.

## What ATS software actually does (so you don't chase myths)
- An ATS is mainly a database and workflow tool. It parses the file into fields (name, employers, titles, dates, skills) and makes them searchable and filterable. [CONSENSUS; Greenhouse and Lever docs describe parsing/auto-fill, not scoring]
- Automatic rejection is mostly **knockout questions** the employer configures on the application form (work authorisation, location, etc.), not hidden resume scoring. Some employers can enable ranking or score thresholds; there is no universal "78% match". [CONSENSUS, partly vendor blogs]
- Therefore the real risks are: (a) the parser **garbles or drops** your data, so you don't appear in searches/filters; (b) a recruiter searching keywords/titles/years of experience doesn't find you; (c) a knockout question. A resume can fix (a) and (b) only.
- No tool can certify "passes ATS". Third-party scores (Jobscan etc.) are vendor estimates. Our `lib/ats.ts` is a coverage estimate. Never tell Inbaraj a resume "will pass".

## Parse-safety rules (make the file machine-readable)
1. **Single reading order, no tables, no multi-column body, no text boxes.** Greenhouse lists "complex resumes with tables, headers, and footers" and "resumes that have a columned layout" as causes of unsuccessful parsing. [OFFICIAL]
2. **Name and contact details in the body**, not in a header, footer or text box. [OFFICIAL]
3. **No graphics, photos, word art, or image-only/scanned PDFs.** [OFFICIAL]
4. **Clear section headings and consistent format within each section.** Use plain headings: Summary, Experience, Skills, Education. [OFFICIAL; CONSENSUS for heading names]
5. **Full job titles** ("Senior Account Executive", not "Sr. Account Exec") and **company names that include identifying words** (Inc., Co., Ltd, LLC) where that is the legal name. [OFFICIAL]
6. **No letter-spaced text** (S K I L L S). The parser sees separate letters. [OFFICIAL]
7. **File ≤ 2.5 MB** (Greenhouse can't parse larger), text-based **PDF or .docx**. Greenhouse also accepts .doc, .rtf, .txt. [OFFICIAL]
8. **Consistent, complete dates (Mon YYYY — Mon YYYY | Present)** for every role. Lever derives years of experience from parsed dates for search filters. [OFFICIAL-ish: Lever API docs via search summary; verify]
9. **Ship two files when the design is rich:** the designed PDF for humans/email, and a plain single-column version for ATS upload forms. (Our designed PDF has stat cards, a skills table and two-column cards.) [HOUSE recommendation from the Greenhouse list above]

## Human-skim rules (make the first screen work)
10. Recruiters spent ~6 s on the first fit/no-fit pass (2012; 7.4 s in a 2018 follow-up) and **~80% of that time on: name, current title/company, previous title/company, start/end dates, education.** Beyond that they scan for keywords. So those items must be **instantly findable, in the usual place, in a clean hierarchy.** [STUDY: TheLadders eye-tracking, 30 recruiters; commercial sponsor, small sample]
11. Clear visual hierarchy and even formatting were rated easier to read (6.2 vs 3.9 on a 7-point scale) and produced calmer gaze paths. [STUDY, same caveats]
12. Language: **specific not general, active not passive, fact-based (quantify and qualify), written to express not impress, scannable.** No personal pronouns, no narrative style, no slang, no photo, no age/gender, no references. List headings in order of importance; reverse-chronological inside; no unexplained gaps; check it still looks right as a PDF. Top mistakes: typos, missing contact info, passive wording, hard to skim, no results shown. [OFFICIAL: Harvard College Mignone Center guide]
13. Bullets: start with a strong action verb; show the result. Use the **X-Y-Z shape: "Accomplished [X], as measured by [Y], by doing [Z]"** (Laszlo Bock, then Google's head of People Operations). Not every bullet needs a percentage: scale, frequency, time saved and outcomes count as the measure. [CONSENSUS; the formula is Bock's, reported by Inc./Business Insider; original LinkedIn post not read]
14. Keep punctuation consistent across all bullets (periods on all or none). [OFFICIAL: Harvard SPH guide, via search summary]

## Summary
15. A short, specific, quantified, job-aligned summary is common advice (2–5 sentences, often ≤100 words); generic ones get skipped. No rigorous study compares resumes with vs without one. [CONSENSUS]
16. **[HOUSE]** Inbaraj's rule is stricter than the guides: **≤430 characters / ≤65 words (3–4 lines on the PDF); never mention the application, role or company; no location (contact line has it); no year counts.** The shape he chose (2026-11-23, Studio-generated, kept over my shorter numbers-first draft): **one sentence on how he works end to end ("owns enterprise SaaS rollouts independently, from discovery workshops and process mapping through solution design, configuration, integrations, UAT, and go-live training") + one sentence of scope and proof (segment, regions, the headline figure, the signature rollout).** Lead with what he does, then the evidence. My own earlier version (a cold run of figures) was rejected. In our PDF the "Professional Summary" is `hero.description`, not `summary`.

## Keywords and ATS matching
17. **Mirror the posting's own terms where they are true** — recruiters search and filters match on exact strings; synonyms are not reliably matched. Write acronyms with the full term once, e.g. "professional services automation (PSA)". [CONSENSUS]
18. **Put keywords in bullets that show the work, not in a stuffed list or the summary.** Pick the 8–12 most important true terms from the posting. [CONSENSUS]
19. A requirement Inbaraj doesn't meet stays a gap. Report it; never add it to raise a score. (Known gaps: variable-compensation framework knowledge, Python, certifications.)
20. **[HOUSE]** Customer segment wording is "mid-market to enterprise". No "N years" phrasing, no other companies' revenue figures. Never put his own pay plan on a resume or cover note.

## Length and layout
21. Two pages is acceptable for an experienced candidate; ResumeGo's simulation (482 hiring pros) favoured two pages with seniority, but it is a simulation and critics dispute it. One page for early career. [STUDY, contested]
22. Our PDF is **2 pages** (`components/ResumePrint.tsx`). A third page holding only Education is a failure. Trim order: repeated sections → card detail → bullet tails → summary.

## Facts (non-negotiable)
Source of truth: `data/base.json`, `data/ground-truth.json`, `docs/career/*.md`. Inbaraj is the authority on his own career: record a new fact in all three first, then use it. Reword, reorder, re-emphasise. Never invent a skill, metric, tool, region or client. Every number on a tailored page must exist in the base resume.

## Procedure
1. **Read the JD.** Table each requirement: covered / partial / gap, with the base-resume evidence. Note the JD's exact terms.
2. **Draft** summary → bullets (X-Y-Z) → skills, using the JD's terms where true. Specific work (e.g. data transformation) gets its own lines.
3. `node scripts/resume-lint.mjs <slug|base>` — fix every FAIL (these are the HOUSE and numeric-fact rules).
4. **Render the PDF** (print CSS) → confirm 2 pages → look at both pages.
5. `node scripts/resume-parse-check.mjs <pdf> [slug]` — the machine-readability test (reading-order integrity, contact in body, headings, titles, dates, file size, images, spaced letters). Fix every FAIL.
6. **6-second test:** cover everything but the top third of page 1. Can you read name, current title + company + dates, previous title + company + dates, education? If not, fix the layout.
7. **Score** with `lib/ats.ts`; report the number and the remaining gaps plainly. State that it is an estimate.
8. Deliver the designed PDF **and** say whether an ATS-plain version is needed for the target's application form.

## What not to do
- Don't promise a pass, a score, or an interview.
- Don't pad the summary with the JD's words to lift the score (we measured this: a 102-word summary scored 10 points higher and was worse for the reader).
- Don't trust a single vendor blog; check `references/evidence.md` for the grade.
