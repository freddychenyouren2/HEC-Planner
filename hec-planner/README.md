# HEC Planner · Spring 2027

A complete static course browser and timetable planner for the HEC Paris International Business Spring 2027 cohort, inspired by NUSMods. Unofficial; schedules are subject to change.

## Open it

Open `index.html` in a modern browser. There is no installation, build, API key or runtime package dependency. All application assets are local; no font or script CDN is used.

For a local web server, from this folder run:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. Browser persistence can be restricted for local files or private browsing; JSON import/export still works. Share links require a hosted HTTP(S) URL. The separate `HEC-Paris-Spring-2027.html` download bundles this same app into one file for easy offline use.

## Features

- 21 subjects, 25 group offerings and 206 distinct dated sessions from the two supplied catalogues.
- Course name, app code and professor search; separate Course Elective (C) / Skills Seminar (S) types and multi-select teaching-week filters with Monday–Sunday dates.
- PDF-derived synopsis on every catalogue card; full synopsis and available learning outcomes / pedagogical objectives in details, plus session counts and total hours.
- Clear C/S types, mandatory labels and G1/G2 group labels; new plans start with all five mandatory offerings.
- One group per subject; selecting another group replaces the first and avoids double-counting credits.
- Weekly timetable with all-weeks overlays or a specific teaching week, previous/next controls and optional weekends.
- Exact minutes on a ten-minute grid, hourly labels from 0800 to 1900 and the catalogue’s nonstandard times.
- Adjacent sessions with exactly ten-minute breaks are visually connected. Longer gaps remain separate.
- Four-month Monday-to-Sunday calendar through 30 April 2027; the official term runs 11 January–16 April. Clicking a date opens its week.
- 25 predetermined colours; newly selected courses receive distinct colours. Click a selected course’s colour dot to cycle to the next unused colour.
- Hide/show controls; hidden courses remain selected and still count in credits, conflict checks and exports.
- ECTS totals split into courses (including the mandatory course) and seminars; unknown ECTS are flagged.
- Exact-date clash detection, including exams; all-weeks overlays do not imply a real clash.
- Local persistence; JSON plan import/export; shareable selection links; ICS export and printing.
- ICS includes Europe/Paris timezone transitions; each real session is a separate event and breaks remain free.
- Responsive layout, keyboard shortcut `/` for search, focus indicators, semantic dialogs and reduced use of icon-only controls.

## Stack and cost

| Layer | Choice | Cost / constraints |
| --- | --- | --- |
| Front end | HTML5, CSS, vanilla JavaScript | Open standards; no licensed runtime or build tooling. |
| Catalogue | Static JSON plus generated `data.js` | Served as ordinary files; versioned with source. |
| Personal plans | Browser `localStorage` | No cloud database; device/browser-specific; JSON backup available. |
| Application server | None | Nothing to provision, run or pay for. |
| Hosting | GitHub Pages on GitHub Free, public repository | Currently free with a default `github.io` address; subject to provider limits and terms. |
| Alternative hosting | Cloudflare Pages, static-only Free plan | Currently free static asset requests; subject to provider build/file limits and terms. |
| Domain | Provider’s default free subdomain | A paid custom domain is unnecessary. |

This implementation has no trial, paid API, external database or billable server dependency. No provider can guarantee its free hosting policy will remain unchanged forever. The portable static files can move to another host if needed. Avoid adding Pages Functions, Workers, paid domains or database services to this version unless requirements change.

Official documentation checked 5 November 2026:

- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- https://developers.cloudflare.com/pages/functions/pricing/
- https://developers.cloudflare.com/pages/platform/limits/

## Publish with GitHub Pages (no build)

1. Create a public GitHub repository, for example `hec-spring-2027`.
2. Upload the contents of this folder to the repository root. Keep every file and the `sources/` folder together, including `sources.js` and `exports.js`.
3. Open repository **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, branch **main**, folder **/(root)**, then Save.
5. GitHub supplies the public URL after deployment. All asset paths are relative, so repository subpaths work without configuration.
6. Test the public URL on desktop and mobile before circulating it to peers.

No account or repository was created, and the site has not been publicly deployed as part of this deliverable. Both source PDFs are included in the repository and source ZIP, and linked from About so peers can verify the transcribed catalogue data.

For Cloudflare Pages, create a static project using the folder as the output or a direct asset upload. No build command or Functions directory is required. Stay on the Free plan and use the default `pages.dev` subdomain.

## Data model and future database migration

`data.json` is the canonical generated catalogue, with one document per course offering (for example `C1-G1`) and dated `sessions` embedded under that offering. Each record carries its C/S type, requirement status, group, ECTS (including `null` for unspecified values), synopsis and optional learning sections, source pages, total session count, total hours and session records. Session dates use ISO `YYYY-MM-DD`; start/end are Paris-local minutes after midnight and week is computed from the 11 January anchor. This shape can map directly to a MongoDB `offerings` collection keyed by `id`, with indexes on `code`, `kind`, `mandatory` and session dates. User plans can later live in a separate `plans` collection referencing offering IDs. No database is used by this static version; keeping the importer and JSON fixture makes that migration explicit and reviewable.

## Maintain the catalogue

Application state is independent of the catalogue. The source of truth is the importer plus the supplied PDFs; `data.js` and `data.json` are generated outputs. The Python importer uses only the standard library and the free Poppler `pdftotext` command.

```bash
python3 scripts/import_catalogues.py /path/to/courses.pdf /path/to/seminars.pdf
```

The original filenames are `2026–2027 Spring Courses Catalogue.pdf` and `2026–2027 Spring Skill Seminars Catalogue.pdf`. Schedule source pages are recorded for each offering. If catalogue titles, ordering or table structure change, review and update the explicit subject mapping in `scripts/import_catalogues.py`. The importer validates expected subject counts, date/day agreement and start/end ordering; still review every changed schedule before publishing. It deliberately does not infer recurring dates or insert undated asynchronous activities.

Read `docs/DATA-AUDIT.md` for date ranges, week numbers, credits and known ambiguities. The two original PDFs are in `sources/`. Read `docs/VALIDATION.md` for checks and the browser verification limitation.

## Repository layout

```text
index.html                  App entry point
styles.css                  Responsive interface and print styles
app.js                      Rendering, search, navigation and plan management
core.js                     Pure scheduling, credits, conflict and export logic
data.json                   Auditable course/session data
data.js                     Generated browser catalogue (no fetch required)
scripts/import_catalogues.py Reproducible PDF schedule importer
scripts/package.py          Build single-file HTML and source ZIP
scripts/update_audit.py      Regenerate data audit table
tests/core.test.cjs          Scheduling and data tests (Node standard library)
tests/render.test.cjs        Rendering smoke checks without a browser
docs/                       Audit and validation notes
```

## Scope

Mandatory status follows the International Business catalogues, not personalised degree rules. This is a planning aid; no capacity enforcement, waitlist, registration, login or cross-device sync is implied. Seat information is not modelled in this version. Rooms are not supplied and are not invented. App codes C1–C12 and S1–S9 are unofficial identifiers.

Original app code is MIT licensed (see `LICENSE`). HEC catalogue content and third-party names retain their original rights. This app uses an original interface inspired by NUSMods; it does not copy NUSMods source code, logos or assets. PDF redistribution is not needed to run it.

## Sharing, document access and visual exports

Click any calendar date cell to show its week; course blocks open course details. Copy plan link opens a dialog showing the link even when clipboard access is denied. A downloaded file has no public URL, so its sharing dialog offers a JSON plan export until the app is hosted.

Print / save current view opens PDF and PNG export choices plus browser printing. The exports are a light-background rendering of the selected calendar or weekly timetable, using visible courses and the active week/weekend settings. They do not require a server, CDN or browser print permission. PDF is a single page containing the rendered timetable image.

Both source PDFs are embedded in `sources.js` so the static folder and standalone HTML can display and download them without relative-file fetches or new-window permissions. Original PDF files remain in `sources/` for direct verification. Regenerate the embedded script with the catalogue importer after updating the originals.
