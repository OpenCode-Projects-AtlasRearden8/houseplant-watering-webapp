# STATUS.md — Plant Schedule

## What was built

Plant Schedule — a single-file, offline houseplant scheduler for
`file://` use. One card per plant with water / fertilize / repot intervals, a
"today" tap list of due and overdue chores with one-tap "Done" logging, light
notes per plant, an emoji photo placeholder, and a vacation mode (×1–×3)
that stretches every schedule while you are away. Education-level care links
(university extension / botanical garden) are included with a plain-language
"education only, not a diagnosis" disclaimer. All data lives in browser
`localStorage` under the key `houseplant-scheduler.v1`; nothing is uploaded.

Files:

- `index.html` — the entire app (HTML + CSS + JS in one file, zero deps). The
  pure date/interval math lives in a self-contained `<script id="core">`
  block exposed as `globalThis.PlantSched` so it can be tested outside a DOM.
- `tests.js` — dependency-free test runner (plain Node `assert`), 32 tests.
- `README.md`, `LICENSE` (MIT), `.gitignore`.

## How to run it

- App: open `index.html` in any modern browser (double-click is fine, works
  from `file://`).
- Tests: `node tests.js`

## Verification results

- `node tests.js` — **all 32 tests pass**, covering: ISO parsing/validating,
  day arithmetic across month/year boundaries, leap-day handling,
  DST-safe diffDays, month clamping (Jan 31 + 1 mo = Feb 28/29), vacation
  stretching of day and month intervals, status bucketing
  (overdue/today/soon/later), per-chore due computation, and the tap-list
  logic (`neededChores`) in both normal and vacation modes.
- Inline UI script and core script both pass a Node syntax check
  (`new Function(...)`); well-formed single-file HTML verified.
- The full UI script was not executed in an automated browser (no DOM
  available in this environment); it was manually reviewed and syntax-checked.
  See gaps below.

## Known gaps

- No manual test of the rendered UI in a real browser in this environment —
  the interactive layer (form save/edit/delete, vacation toggle, tap list)
  is syntax-checked and logic-tested at the math layer, but not
  browser-clicked here.
- No data export/import or backup file yet — clearing browser site data
  clears the plant list (README warns about this).
- Photo "placeholder" is an emoji picker; real image uploads were left out
  intentionally to keep localStorage tiny and the file simple.
- Vacation stretch uses a single multiplier for all chore types; per-plant
  overrides could come later.
- No service-worker/PWA offline caching — opening `index.html` from the
  filesystem is already fully offline.
