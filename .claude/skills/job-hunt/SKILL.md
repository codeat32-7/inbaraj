---
name: job-hunt
description: Daily job-hunt workflow for Inbaraj B. Finds new roles (Indeed), triages them against his verified career facts, prepares at least 5 shortlisted roles a day whose tailored resume can honestly reach an ATS score of 95%+, and logs everything in data/jobs/. Use when asked to run the daily job search, review past opportunities, or tailor and score a resume for a specific role.
---

# Job hunt — Inbaraj B

Goal: every day, put **5 roles** in front of Inbaraj where a tailored resume at `/r/<slug>` scores **95%+** on the in-repo ATS scorer — without inventing a single fact.

## Who he is (verified — source: `data/base.json`, `data/ground-truth.json`, `docs/career/`)

Chennai, India. Hybrid or remote only (Indeed profile: not willing to relocate). Implementation leader who owns enterprise SaaS delivery end to end and builds the AI agents that make it repeatable.

- **Rocketlane — AI Implementation Manager (May 2026–present).** Implementation manager + solution architect + engagement manager on a PSA platform. Implements **Nitro** (agentic AI platform) for customers. Built the Nitro agents the team runs on (handover, kickoff decks, workshop planner, solution design docs, UAT scripts, form-to-Sheets) as part of Customer Zero. Built a **Nitro Workforce configuration agent POC** (reads design docs, configures via Browserbase; validated by product). Built **Atlas** (Claude agents on Anthropic, Supermemory RAG, Lovable backend, human-in-loop approval, current-state validation, validator agent; 60–65% PS-team adoption, ~10 queries/user/week, 70–80% useful). Solution architect on **NICE Phase 2**: ADP, SatMetrix, ServiceNow, Salesforce integrations (~$450K ARR implemented).
- **Facilio — Lead, Product Implementation (Nov 2021–May 2026).** CMMS SaaS. Enterprise rollouts across UK/US/Middle East, $4.1M+ TCV, nearly $1M implementation + expansion value, $350K+ pilot→enterprise expansion. Discovery workshops, BRDs, WBS plans, UAT, go-live; on-site Saudi Arabia and UK (MHA). Built the complexity-scoring/effort-model framework for pre-sales; PS-credits billing fix. Built **AI Config Assistant** (RAG + NLP over XML configs).
- **Amazon — Senior Catalog Specialist (May 2016–Oct 2021).** Defect prioritisation framework (~$230K/month est. savings), ~50 invalid cases/day removed.
- **Side projects:** FAAX (AI-assisted options trading), Resume Studio (this repo).
- **Tech:** REST/webhooks, iPaaS (Workato, Zapier), Salesforce, HubSpot, Sage, SuccessFactors, ADP, ServiceNow; JS UI scripting; Claude, prompt engineering, RAG, Supermemory, Browserbase, Lovable, Vercel, GitHub. M.Tech Embedded Systems, B.E. ECE.

### What he is NOT (do not shortlist against, do not claim)
Not a software engineer by title; no production backend/ML-engineering history; no people-management headcount claim; no certifications listed (PMP, Salesforce admin, etc.); no work history in banking/healthcare/ads/security. Items under "Details Not Yet Specified" in `docs/career/atlas.md` are off-limits. No aggregate implementation counts, no "N years" phrasing in resume copy; dollar amounts are attributed to the company they came from.

## Target roles (in priority order)
1. Forward Deployed Engineer / Strategist (AI) — customer-facing, agents, integrations
2. AI Implementation Manager / Lead, Agent Deployment, Deployment Strategist
3. Solutions Architect / Solutions Consultant / Technical Solutions (SaaS, integrations)
4. Implementation Lead / Manager / Senior Implementation Consultant (enterprise SaaS)
5. Business Analyst / Technical Business Analyst (SaaS, integrations)
6. Technical Account Manager / Customer Success Engineer (enterprise, integrations)

Previous applications that worked as templates (see `data/profiles/registry.json`): DevRev FDE-AI Strategist, Level AI FDE, DehazeLabs Deployment Strategist, Rippling Implementation Analyst, Everstage, greytHR, Uplers, TRG Screen.

## Daily procedure

1. **Load state.** Read `data/jobs/tracker.json` (every role ever surfaced, with status) and `data/profiles/registry.json` (already-published tailored pages). Never re-surface a role already in either.
2. **Search (Indeed connector: `mcp__Indeed__search_jobs`).** Run ~8–12 queries, locations `remote` and `Chennai`, country `IN` (plus `remote` with country `US`/`GB` only for roles explicitly open to India-based candidates). Query terms: "forward deployed engineer", "AI implementation", "agent deployment", "deployment strategist", "solutions architect SaaS", "implementation lead SaaS", "implementation manager", "technical business analyst SaaS", "customer success engineer". Prefer posts from the last 14 days. **LinkedIn: use Apify.** `POST https://api.apify.com/v2/acts/fantastic-jobs~advanced-linkedin-job-search-api/run-sync-get-dataset-items` with `{timeRange:'7d', limit:50, removeAgency:true, descriptionType:'text', titleSearch:[...], titleExclusionSearch:['Intern','Junior'], locationSearch:['India']}` (~$0.005/job, keep `limit` ≤ 50). It returns full `description_text`, `ai_work_arrangement`, `ai_experience_level`, so no second call is needed. The Apify token is injected by the environment proxy (no env var; never print or hard-code it). The "LinkedIn Hiring Pro" connector is employer-side only and cannot search. **Inbaraj is from implementation, not engineering:** title-exclude SDE/DevOps/backend/full-stack/data-engineer/cloud/Java, then classify each JD by implementation signals (discovery, stakeholders, go-live, onboarding, solution design, integrations) vs coding signals (Python, K8s, Terraform, LangChain, '5+ yrs software'); drop coding-heavy ones. Plain 'Forward Deployed Engineer' titles in India are almost always engineering; the real fits are titled Deployment Strategist, Technical Implementation Lead, Implementation Manager/Lead, Business Solutions Consultant, TAM. Prefer posts from the last 7 days. After filtering on location (Chennai/remote; skip on-site elsewhere) read the JD in full before ranking: many 'Forward Deployed Engineer' posts in India are software-engineering roles (4–7+ yrs Python/K8s/LangGraph) and are hard gaps. If the Indeed tools aren't available in this session (scheduled runs may start without connectors), fall back to `WebSearch`/web fetch over company career pages and Greenhouse/Lever/Ashby listings, and say in the digest that Indeed was not used.
3. **Pull the full JD** for every plausible hit (`mcp__Indeed__get_job_details`). Reject listings with no usable JD text — the scorer needs the real description.
4. **Fit gate (honest pre-score).** For each JD, list its requirements and mark each covered / partial / missing against the verified facts above. Drop the role if any must-have is a hard gap (specific certification, coding-heavy SWE, 8+ yrs in a domain he lacks, on-site outside Chennai/relocation, junior pay band). Estimate the ATS result as a *prediction*, label it "pre-score", and only advance roles predicted ≥ 95%.
5. **Tailor + score (the real gate).** Generate the tailored profile through Resume Studio (`/api/generate` → review → `/api/ats-score` with `judge: 'jev'` and `judge: 'claude'`, as on `/admin/ats`). A role counts toward the daily five **only when the measured score is ≥ 95%** and the fact validator (`data/ground-truth.json`) passes. Re-tailor at most twice by re-wording/re-ordering *existing* facts.
   - **If the score stays under 95%, the role does not count.** Record it as `below-threshold` with the missing requirements. Do not add the missing keywords, do not stretch a bullet, do not invent a skill or metric to get over the line (CLAUDE.md: "Never auto-add missing keywords"). A 95% that required a made-up fact is a failed application.
   - If the Studio API isn't reachable from the current environment (it needs `ADMIN_PASSWORD`, `ANTHROPIC_API_KEY`, optionally `TYPESAFE_API_KEY`), do steps 1–4 only, save JD text, and mark the roles `needs-scoring` for the interactive session. Never report an unmeasured number as a score.
6. **Publish nothing automatically.** Tailored pages go live only after Inbaraj reviews them in the interactive session.
7. **Log.** Append every surfaced role to `data/jobs/tracker.json` and write the day's digest to `data/jobs/digests/YYYY-MM-DD.md` (see format). Commit on the feature branch, push, never to `main`, no PR unless asked.

## Digest format
```
# Opportunities — YYYY-MM-DD
Ready to apply (≥95% measured): n/5
| # | Role · Company | Location | Score (Jev / Claude) | Link | Slug |
Needs review / below threshold: role — missing requirements — why dropped
Search coverage: queries run, hits seen, rejected (with reason counts)
```
If fewer than 5 roles clear the bar, say so plainly and list the near-misses. **Do not lower the threshold or pad the list to reach five.**

## Rules that never bend
- No fabrication: every claim traces to `data/base.json`, `data/ground-truth.json`, or `docs/career/`.
- Don't share personal details outside the resume surface (no emailing recruiters, no form submissions) without explicit approval in the session. Applying is Inbaraj's action.
- The ATS score is an estimate of keyword/requirement coverage, not a real ATS result. Say so when presenting it.

## Interactive review ("you and I sit down")
When asked to review past opportunities: read `data/jobs/tracker.json` + `data/profiles/*.json`, summarise per role (JD match, score if known, outcome), and call out patterns — which role families score ≥95% honestly, which keep falling short and why — then update the target-role list above.
