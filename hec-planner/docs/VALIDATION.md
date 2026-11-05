# Validation

Checked 5 November 2026.

## Automated checks completed

Run from the project folder:

```bash
node --check app.js
node --check core.js
node --test tests/core.test.cjs tests/render.test.cjs
```

**18 tests pass.** No npm installation is required; tests use Node's standard library.

The core tests cover:

- Catalogue counts, duplicate sessions, source-derived week fields and time bounds.
- Monday teaching-week boundaries, pre-semester dates, continuous weeks and the March DST boundary.
- ECTS split, alternative groups, hidden courses and missing credits.
- Co-teacher deduplication, retained exam and nonstandard elective times.
- True date/time conflicts, adjacent boundaries and different-week non-conflicts.
- Exact ten-minute grouping and separation of lunch/longer gaps and exam types.
- All-weeks aggregation, explicit date sets and non-contiguous week labels.
- Interval lane placement.
- Imported plan sanitisation, group deduplication and unique palette colours.
- Calendar export event counts, exam time, Europe/Paris DST and 75-octet UTF-8 folding.

The rendering smoke tests execute the application in a small simulated DOM shell. They cover initial rendering, all 21 course cards, search and filter combinations, four-month/7-day calendar markup, group replacement, hiding, credit retention, exam-week views, share payloads and detail-dialog session data. **These are not full browser or visual layout tests.**

A separate annex-row reconciliation accounts for all 210 raw dated rows as 206 distinct sessions plus four repeated co-teacher rows. The bundled single-file HTML was checked for three inline scripts, unique static IDs and no externally loaded assets.

The importer also verifies subject counts, actual weekday/date agreement, positive session durations and exact duplicate row merging. The source annex at Courses PDF page 56 and the Worlds syllabus page 17 were visually inspected. Exact source page references are retained in every offering.

## Browser verification limitation

A browser connection to the local development server was refused because the browser runs in a different environment. Opening the shared local HTML file was blocked by the browser's URL policy. Installing a separate headless browser was blocked by the network allowlist. No browser screenshots, end-to-end browser pass or pixel-level visual review is claimed.

Before circulating the public site, open it in desktop Chrome/Firefox/Safari and on a phone, then check:

1. Use the example plan; switch between all-weeks and weeks 1, 5, 11 and 16.
2. Browse/filter courses, add a course, change G1/G2 and inspect its dated sessions.
3. Hide/show a course; verify credits stay unchanged.
4. Add C6 and C8 to see the actual 2 February clash; compare with same-time courses on different dates.
5. Open the semester calendar and expand weeks in each month.
6. Export/import JSON; open a share link with an existing plan to see the replacement preview.
7. Import the ICS into your calendar; confirm Paris times before and after 28 March.
8. Print each view; review text legibility, narrow overlapping blocks and colour contrast.
9. Refresh the page to verify local persistence; test with browser storage disabled.
10. Check zoom at 200%, keyboard navigation and screen-reader labels.

This project is ready for local review and static hosting configuration, but has not been publicly deployed.

## Frontend fixes, 5 November 2026

23 Node scheduling and rendering regression checks pass. Coverage includes detail dialogs for all 25 offerings, mandatory removal confirmation, catalogue removal buttons, separate calendar event/detail and date/week controls, both PDF source links, and Blob URL opening for embedded standalone PDFs. These are DOM-shell and logic checks; browser visual verification remains outstanding.

## Calendar, export and PDF access fixes

27 scheduling and UI-shell regression checks pass, including blank date-cell clicks, sharing with denied clipboard access, offline sharing feedback, print/save options and embedded PDF viewing. PNG/PDF renderers were exercised using a real Canvas implementation for both calendar and weekly layouts; generated PDFs parsed successfully with pdfinfo. Browser interaction verification is limited because Chromium is unavailable in this runtime.
