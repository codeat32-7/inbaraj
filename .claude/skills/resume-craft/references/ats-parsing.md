# ATS parsing: mechanics and the check we run

## How parsers treat a file
1. The file (PDF/DOCX) is converted to text, then a parser maps text to fields: name, contact, employers, titles, dates, schools, skills. Greenhouse describes this as scanning the resume and "auto-fill[ing] appropriate fields".
2. Anything the parser can't place is dropped or mis-filed, and the recruiter sees a partially filled profile (Greenhouse: "will need to be manually corrected and verified").
3. Parsed fields feed search and filters (Lever: company, title, school, years of experience calculated from parsed dates). So **titles, employers and dates are the highest-value fields**, which also happens to match where recruiters look first (TheLadders).

## What breaks parsing (Greenhouse's own list)
- Tables, headers, footers, text boxes, columned layouts
- Name/contact in header, footer or text box
- Graphics, photos, word art; image-only files
- Spaced-out letters
- No clear sections, or different formats in each section
- Company names lacking Inc./Co./LTD/LLC
- Abbreviated/incomplete job titles
- Files over 2.5 MB

## Known risks in Inbaraj's designed PDF (components/ResumePrint.tsx)
| Feature | Risk | Status |
|---|---|---|
| Stat-card row above the summary | Read first by a linear parser; pollutes the opening content | Reading order test: intact but first |
| 2-column highlight cards | Break any position-based parser (`-layout` mode interleaves 11/18) | Linear extraction OK |
| Skills **table** | Greenhouse lists tables as a failure cause | Linear extraction OK; real parser untested |
| Letter-spaced section headings (CSS) | Spaced letters can be read as separate letters | `pdftotext` reads them as words; check each render |
| Company names "Rocketlane", "Facilio", "Amazon" | No Inc./LLC (Greenhouse lists this) | Ask Inbaraj for legal names before using |
| Title in header line "AI Implementation Manager" | Fine; the full title is used | OK |
| Dates "May 2026 — Present" | Consistent format | OK |

**Recommendation:** keep the designed PDF for humans; produce a plain single-column version (no cards/table/stat row, standard headings, full titles) for ATS application forms.

## The check: `node scripts/resume-parse-check.mjs <pdf> [slug|base]`
Runs `pdftotext` on the PDF and tests:
1. **Reading-order integrity** — every bullet, card line, summary and skill line of the source resume must appear contiguous in the extracted text (default and `-raw` modes). Reports the share intact.
2. **Contact in body** — email and phone in the first lines of text.
3. **Standard headings present** — Summary, Experience, Skills, Education.
4. **Titles** — full words, no "Sr./Mgr./Exec." abbreviations.
5. **Companies** — warns when a company name lacks an identifying suffix.
6. **Dates** — each role has a consistent "Mon YYYY — Mon YYYY|Present" range.
7. **File** — size ≤ 2.5 MB; text extractable (not image-only); count of embedded images.
8. **Letter-spacing** — no "S K I L L S"-style runs in the extracted text.
9. **First content** — warns if stat/figure text precedes the summary in reading order.

A pass means "no structural parse risks found by this check". It does **not** mean a real ATS will parse it perfectly. Say so.

## Optional real-ATS checks
- Greenhouse and others show a parsed-profile preview to recruiters; candidates don't see it. If Inbaraj has access to any ATS account (or a friend in recruiting), upload the PDF there and compare the parsed fields to the resume.
- Always copy-paste the PDF text into a plain editor: if it reads in order, most parsers will cope.
