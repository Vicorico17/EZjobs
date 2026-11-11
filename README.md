# EZJobs

A responsive job discovery prototype built with plain HTML, CSS, and JavaScript. Browse six sample roles, build a shortlist, and prepare application drafts without creating an account.

## Run locally

```sh
python3 -m http.server 4173
```

Open <http://localhost:4173>. There is no build step or runtime dependency. Any static host can serve the project root.

## What works

- Independent role/skill/company and location searches, with multiple search terms
- Discipline and remote filters that compose with saved-job browsing
- Sorting by recency in the sample catalog, company, or title
- Persistent bookmarks, a local profile, and downloadable application drafts
- Two-step draft preparation with retained form values and résumé type/size validation
- Mobile job details with a return-to-results control
- Native accessible dialogs, keyboard focus management, a skip link, filter states, and reduced-motion support
- Recovery from unavailable or malformed browser storage
- Privacy controls to delete the app’s local data

## Demo boundaries and privacy

All companies and listings are sample content. The app does not fetch live vacancies, authenticate users, calculate personal match scores, or send applications. “Newest first” follows the sample catalog order rather than live posting dates.

Bookmarks, profile details, and drafts use `localStorage` in the current browser. Drafts contain contact details, a note, and the résumé **filename only**. Résumé file contents are never uploaded or persisted. Reopening a saved draft requires selecting the résumé again. Downloads are plain-text copies, not application submissions. Avoid storing personal data on shared devices; the footer’s **Your data & privacy** control removes all three app storage keys.

Google Fonts is the only external page resource; system font fallbacks work without it. No analytics are included. Clearing browser data removes local profiles and drafts, and data does not sync across devices.

## Tests

Requires Node.js 22 or later for development tooling.

```sh
npm ci
npm test
npx playwright install chromium
npm run test:e2e
```

The browser suite starts its own local server and checks desktop and mobile search, filters, bookmarks, profiles, keyboard focus, draft validation/downloads, storage recovery, and page overflow. To use an existing Chromium installation:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE="/path/to/chrome" npm run test:e2e
```

## Project structure

- `index.html` — semantic page shell
- `styles.css` — responsive styles and reduced-motion rules
- `jobs.js` — sample job catalog
- `core.js` — pure search, storage, escaping, and validation helpers
- `app.js` — rendering, interactions, local profile, and draft workflow
- `tests/` — logic and browser regression tests

## Before turning this into a live service

Replace the sample catalog with verified listings and real posting timestamps. Add authentication, server-side validation, secure résumé storage, and an application delivery service with confirmed submission states. Define a retention/deletion policy before collecting applicant data. Keep the existing demo language until those services are connected and tested.
