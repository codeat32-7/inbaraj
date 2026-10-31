# CLAUDE.md

Project instructions for Claude Code sessions working on this repository.

## Project overview

Personal portfolio and resume site for Inbaraj B at [inbaraj.info](https://inbaraj.info). Originally a single static `index.html`, now a **Next.js 16 App Router** application deployed on **Vercel** with AI-powered resume tailoring.

The site serves two purposes:
1. Public portfolio — base resume visible at `/`
2. Company-targeted resumes — AI-tailored versions at `/r/<slug>`, generated via Claude API from job descriptions

## Tech stack

- **Framework**: Next.js 16.2.2 (App Router, React 19)
- **Language**: TypeScript
- **Styling**: Vanilla CSS (globals.css) — no Tailwind utilities used despite the dependency existing
- **Fonts**: Google Fonts (DM Mono, Spectral, DM Sans) loaded via `next/font/google`
- **AI**: Anthropic Claude API (`@anthropic-ai/sdk`) for resume tailoring
- **Deployment**: Vercel (auto-deploys from `main`)
- **Data storage**: JSON files in `data/` committed to git via GitHub Contents API
- **PDF**: Browser `window.print()` with `@media print` CSS

## Repository structure

```
app/
├── page.tsx                       # Base resume at /
├── layout.tsx                     # Root layout with fonts and metadata
├── globals.css                    # All CSS (dark/light themes, responsive, print)
├── r/[slug]/page.tsx              # Company profile pages (force-dynamic)
├── admin/
│   ├── page.tsx                   # Admin dashboard (client component)
│   └── _components/               # Admin sub-components
│       ├── ProfileSidebar.tsx     # Left sidebar: new resume, base, tailored list
│       ├── JDForm.tsx             # Job description input form
│       ├── GeneratedPreview.tsx   # Formatted preview of AI output
│       ├── EditablePreview.tsx    # Click-to-edit preview with AI assist
│       └── ProfilePreview.tsx     # Iframe preview of resume pages
└── api/
    ├── adapt/route.ts             # POST: Adapt existing resume with instructions
    ├── ai-edit/route.ts           # POST: AI-assisted single-field editing
    ├── generate/route.ts          # POST: Claude API resume tailoring
    ├── scrape/route.ts            # POST: URL scraping via Apify + Claude extraction
    └── profiles/
        ├── route.ts               # GET/POST: List and create profiles
        └── [slug]/route.ts        # GET/DELETE: Individual profile ops

components/                        # Resume display components
├── ResumeLayout.tsx               # Main orchestrator
├── Navigation.tsx                 # Sticky nav bar
├── Hero.tsx                       # Hero section with badges and stats
├── Experience.tsx                 # Work experience timeline
├── Projects.tsx                   # Project cards grid
├── Skills.tsx                     # Skills grid with education
├── BookingSection.tsx             # Calendly booking
├── Contact.tsx                    # Contact section
├── CustomSection.tsx              # AI-added sections renderer
├── ResumePrint.tsx                # Hidden print-optimized resume
├── ResumeDownload.tsx             # Download CV buttons (client)
├── ScrollReveal.tsx               # Intersection observer animations
└── ThemeToggle.tsx                # Dark/light toggle (client)

data/
├── base.json                      # Base resume (source of truth)
└── profiles/
    ├── registry.json              # Slug → company mapping
    └── <slug>.json                # Company-specific overrides

lib/
├── types.ts                       # All TypeScript interfaces
├── resume.ts                      # Data loading + deep merge
├── ai.ts                          # Claude API integration with retry
├── apify.ts                       # Apify client (LinkedIn actor + generic crawler)
├── scrape.ts                      # Claude-based structured JD extraction from scraped text
├── github.ts                      # GitHub Contents API client
└── slug.ts                        # Company-name-based slug generation

middleware.ts                      # Cookie-based profile isolation
index.html                         # Original static site (preserved)
```

## Key commands

```bash
npm run dev          # Start dev server
npm run build        # Production build (verify before pushing)
npm run lint         # ESLint
```

## Environment variables

Required in Vercel project settings (not team settings):

| Variable | Purpose |
|----------|---------|
| `ADMIN_PASSWORD` | Admin dashboard login |
| `ANTHROPIC_API_KEY` | Claude API for resume tailoring |
| `APIFY_API_KEY` | Apify API token for URL-based JD scraping |
| `GITHUB_TOKEN` | Fine-grained GitHub PAT with Contents read/write on this repo |
| `GITHUB_BRANCH` | Target branch for profile commits (should be `main`) |
| `TYPESAFE_API_KEY` | Jev (TypeSafe AI) API key, used by the ATS scorer. Optional — scorer falls back to a keyword heuristic without it |
| `TYPESAFE_API_URL` | Full Jev classify endpoint URL. Jev is only used when both this and the key are set |

## Development conventions

- **No Tailwind utilities** — all styling is in `globals.css` using vanilla CSS with CSS variables for theming
- **Inline styles** in admin components — the admin page uses React `style` objects, not CSS classes
- **Server components by default** — only add `'use client'` when needed (event handlers, hooks)
- **Data flow**: `data/base.json` → `loadBase()` → components. Profile overrides are deep-merged via `mergeResume()`
- **GitHub as database** — profile JSONs are committed to the repo via GitHub API. No external database.
- **Static + Dynamic rendering** — base page is static (`○`), profile pages are force-dynamic (`ƒ`) to support GitHub API fallback
- **Git workflow** — Always push changes to a feature branch, never directly to main. Do not squash commits unless there is an error to fix. Wait for user to test before merging to main.

## Gotchas

### Cookie redirect in admin
The middleware sets a `profile_lock` cookie when visiting `/r/[slug]`. This redirects `/` to the profile page. The admin's base resume iframe uses `/?view=base` to bypass this. If you change the middleware, make sure this bypass still works.

### Vercel environment variable scope
Env vars must be set at the **project** level in Vercel, not the team level. Also ensure they're enabled for the **Preview** environment during development, not just Production.

### Static imports are build-time only
`lib/resume.ts` imports `registry.json` and `base.json` statically. These reflect build-time state. The API routes read the registry from GitHub at runtime (`getRegistryFromGitHub()`) to get fresh data. If you add new static imports of profile data, remember they won't reflect post-build changes.

### Profile loading fallback chain
`loadProfile()` tries: filesystem first → GitHub API fallback. This is needed because Vercel's filesystem doesn't have profiles committed after the last build. The GitHub API fallback makes newly published profiles immediately accessible.

### Claude API retry
`lib/ai.ts` retries on 500/socket errors with 3s/6s backoff (max 2 retries). It also strips markdown code fences from responses since Claude sometimes wraps JSON in ` ```json ``` ` despite the prompt saying not to.

### Print CSS specificity
The `@media print` CSS in `globals.css` hides everything with `body>*{display:none!important}` and shows only `#resume-content`. The `ResumePrint` component renders the print-optimized layout. Changes to the visible page layout don't affect the PDF — you must update `ResumePrint.tsx` separately.

### iframe cookie isolation
The middleware skips setting `profile_lock` cookies for iframe requests (`sec-fetch-dest: iframe`). This prevents admin preview browsing from locking the user's session.

### Original index.html still exists
The file `index.html` is preserved in the repo for reference but is NOT served by Next.js. The actual homepage is `app/page.tsx` which renders from `data/base.json`.

### Profile override format
Profile JSONs only contain fields that differ from the base. The `mergeResume()` function deep-merges them. Setting a section to `false` hides it entirely. The `customSections` array adds new sections not in the base.

### Slug generation
Slugs are derived from the company name (and optional role label). `"Rippling"` → `rippling`, `"Rippling" + "Implementation Lead"` → `rippling-implementation-lead`. Non-alphanumeric characters become hyphens. No hashes or random IDs.

### Calendly URL in base.json
`personal.calendly` stores the **full URL** (e.g. `https://calendly.com/inbarajb91/30min`). The `BookingSection` component uses it directly — do NOT wrap it in another `https://calendly.com/` prefix.

### AI hallucination in generated profiles
The current single-prompt approach does NOT reliably prevent fabrication. Claude will invent skills, metrics, and experience to match the JD despite the "NEVER fabricate" instruction. All AI-generated content MUST be validated against the base resume before publishing. A validation pipeline (Phase 0 in roadmap) is planned to fix this. Until then, manually review every generated profile for fabricated content.

### ResumePrint is a separate render tree
`ResumePrint.tsx` renders a completely independent layout for PDF. It must be updated separately from the visible page components. It receives the same merged `data` prop but renders with its own inline styles for print formatting. It also renders `customSections` so AI-added sections appear in PDFs.

### Admin create flow is a wizard state machine
The "create" tab in `/admin` uses a `WizardPhase` discriminated union to render one phase at a time (intake → processing → review → publishing → published). State lives in `page.tsx`. The `JDForm` component is presentational — it receives `step`, `data`, and callbacks from the parent. Do NOT add internal state to `JDForm`.

### Intake data lives in page.tsx, not JDForm
`intakeData` (companyName, roleLabel, jobDescription) is stored in `page.tsx` and passed down to `JDForm`. This ensures data persists across back/forward navigation between intake steps.

### AbortController for generation cancellation
`handleStartTailoring` creates an `AbortController` stored in `abortControllerRef`. The Cancel button in `ProcessingView` calls `abort()` and resets to the JD step. The catch block checks for `AbortError` to avoid showing an error message on intentional cancellation.

### LinkedIn scraping requires a dedicated actor
LinkedIn blocks all generic scraping (direct fetch, headless browsers, Apify's generic crawler). The only reliable approach is `apimaestro~linkedin-job-detail` which accesses LinkedIn's data API. It takes a `job_id` array and returns structured data (title, company, description). Generic career pages (Greenhouse, Lever, etc.) still use `apify~website-content-crawler`.

### Apify actor IDs use tilde in API URLs
Actor IDs like `apimaestro/linkedin-job-detail` must be written as `apimaestro~linkedin-job-detail` in the REST API URL. The `/` would be treated as a URL path separator, causing a 404.

### Three-path wizard flow
The intake wizard has three entry paths: URL (url → confirm), manual (company → role → jd), and adapt (select-source → adapt-details). All converge at the processing phase. `scrapeUrlValue` and `adaptSource` in page.tsx track which path was taken so Cancel/Revise/error navigate back to the correct step.

### Apify crawler type must be `playwright:adaptive`
The `apify~website-content-crawler` actor requires `crawlerType: 'playwright:adaptive'` or `'playwright:firefox'`. Bare `'playwright'` or `'cheerio'` are rejected with a 400 error.

### EditablePreview uses path-based field identification
Each editable field in `EditablePreview.tsx` is identified by a dot-separated path like `experience.0.bullets.1`. The `deepSet` utility immutably updates the overrides object at that path. If you add new editable sections, each field needs a unique path that maps to the overrides JSON structure.

### Default variant slugs use d- prefix
When creating a resume variant from the base without a company name, the slug uses a `d-` prefix: `/r/d-implementation-lead`. This is a naming convention on the same `/r/[slug]` route — no separate route exists. The registry stores the role label in the `company` field.

### Ground truth auto-update is best-effort
The PATCH `/api/profiles/[slug]` endpoint tries to update `ground-truth.json` after saving edits, but failures are silently logged and don't block the save. Don't rely on ground truth being immediately updated after every edit.

### Inline editing uses formatted preview, not iframe
Phase 3 editing works on the card-based formatted preview (EditablePreview), not the actual rendered resume page in the iframe. The iframe remains read-only. A future `/update` route could enable WYSIWYG editing on the real page.

### PDF pagination — use grid + `breakInside: avoid`, not forced page breaks
For multi-card rows in `ResumePrint.tsx` (experience highlights, projects, skills, education): use **CSS grid** (not flex with `flex: 1`) and apply `breakInside: 'avoid'` + `pageBreakInside: 'avoid'` to each card. Flex rows can't break — the whole row gets sliced at the page boundary, leaving empty column stubs on the next page. Grid rows break naturally and `breakInside: avoid` on individual cards prevents mid-card splits.

Do NOT add forced page breaks (`pageBreakBefore: 'always'`) between sections. They cause huge mid-page gaps when the previous section overflows by a small amount. Trust natural pagination.

### `GITHUB_BRANCH` must match Vercel's deploy branch
The admin dashboard commits profile JSONs via the GitHub Contents API to whatever branch `GITHUB_BRANCH` names. If this env var drifts from the branch Vercel auto-deploys from (should be `main`), every published profile lands on a stale branch and never reaches production. This happened once — 5 profiles stranded for ~8 days. Check the env var first whenever a publish "succeeds" but the `/r/<slug>` URL 404s or lags.

### Shared auth lives in `lib/auth.ts`
All API routes go through `requireAuth(request)` — don't duplicate the header check. It returns a 401 `NextResponse` on failure or `null` on success. Supports both bcrypt-hashed and plaintext `ADMIN_PASSWORD` (auto-detected by `$2a$/$2b$/$2y$` prefix). Uses `crypto.timingSafeEqual` for plaintext and `bcrypt.compare` for hashed — both timing-safe.

### Rate limiting is in-memory and per-instance
`lib/rate-limit.ts` uses a module-level `Map`. Each Vercel serverless instance has its own map, so a distributed attacker can exceed the per-instance limit by cold-starting new instances. Fine for deterring casual abuse; swap in `@upstash/ratelimit` + Upstash Redis if you need strictness. Limits are declared inline at each route — don't hide them in a central config.

### HTML sanitization allowlist is intentionally tiny
`lib/sanitize.ts#sanitizeInlineHtml()` allows only `<em>` and `<br>`. This is a conscious choice, not an oversight — expanding the allowlist re-opens the prompt-injection XSS vector that Phase 4 closed. If a new field needs richer formatting (e.g. `<strong>`), weigh the XSS surface against the UX gain before adding tags to the allowlist.

### Every `dangerouslySetInnerHTML` must use `sanitizeInlineHtml`
If you add a new one, wrap it: `{ __html: sanitizeInlineHtml(value) }`. Six existing sites are already wrapped (Hero, CustomSection, ResumePrint skills, ResumeLayout footer, EditablePreview, GeneratedPreview). An unwrapped use on AI-generated data is a security regression.

### Slug regex `/^[a-z0-9-]{1,120}$/` is enforced in three places
`middleware.ts` (cookie write + redirect), `/api/profiles` (POST), `/api/profiles/[slug]` (GET/PATCH/DELETE). Keep them in sync. Don't allow underscores, dots, or any other characters — the character set is narrow because slugs appear in cookies, URLs, filenames, and commit paths.

### Rotate `ADMIN_PASSWORD` to bcrypt with the helper script
`node scripts/hash-password.mjs "your-password"` outputs a `$2b$12$…` hash. Paste into the Vercel env var, redeploy. Plaintext-compat path stays in place so there's no outage during rotation. Never commit a plaintext admin password to the repo or paste it into chat.

### Career facts live in `docs/career/`
`docs/career/atlas.md` is the source of truth for the Atlas project (Rocketlane). When writing or editing resume copy about Atlas in `data/base.json`, keep it consistent with that doc and update `data/ground-truth.json` to match. Do not add anything listed under "Details Not Yet Specified" (embedding model, accuracy metrics, cache technology, etc.) unless Inbaraj provides it. Also: no aggregate implementation counts or "N years" phrasing in resume copy; use dollar amounts attributed to the company they came from.

### ATS scorer (`lib/ats.ts`, `/api/ats-score`)
Scores a tailored page against its JD: 35% keyword coverage, 50% requirement match, 15% parse-ability checks. Requirement match uses Jev (`lib/jev.ts`) as a covered/partial/missing classifier, with a keyword-overlap fallback; the response's `method` field says which ran. The Jev request/response shape in `lib/jev.ts` was written WITHOUT the TypeSafe docs — verify `buildBody`/`parseResponse` against the console example before trusting `method: 'jev'`. It is an estimate, not a real ATS result, and it is not run for the adapt flow (no JD). Never auto-add missing keywords to a resume: that bypasses the fabrication validation.

## Session handoff protocol

When the user says **"session completed"** (or similar), follow this checklist before ending:

1. **Check for unmerged branches**: `git fetch --all && git branch -a --no-merged main` — warn if any exist
2. **Verify main is clean**: `git status` on main — no uncommitted work
3. **Update documentation**:
   - `memory.md` — add session entry with changes, bugs, decisions, lessons
   - `memory.md` checklist — mark completed items, add any new planned items
   - `CLAUDE.md` — add any new gotchas discovered
   - `context.md` — update history table and roadmap if needed
4. **Generate next-session prompt** — paste a ready-to-use prompt below (update it with current state)
5. **Commit and push** all doc updates to main

