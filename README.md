# Plant Schedule

A tiny offline webapp for keeping houseplants alive: one card per plant with
water / fertilize / repot intervals, a "today" tap list showing exactly what
is due, light notes, an emoji photo placeholder, and a **vacation mode** that
stretches every schedule while you are away.

Built by [Asdale Dynamics, LLC](https://dylanasdale.github.io) as part of our
beginner-friendly, local-first tool series.

## How to run it

No install, no build, no dependencies, no server:

1. Download or clone this folder.
2. Double-click `index.html` (or open it with your browser's "Open File…").

Everything runs from `file://` in any modern browser. All data is stored in
your browser's `localStorage` — nothing is uploaded, nothing leaves your
machine. Clearing site data in your browser will delete your plant list, so
keep that in mind.

## What it does

- **Plant cards** — name, emoji photo placeholder, light notes, and optional
  intervals for watering (days), fertilizing (days), and repotting (months).
- **Today list** — a tap list at the top of the page with everything that is
  due or overdue. Tap "Done ✓" to log a chore as completed today.
- **Vacation mode** — toggle it in the header and pick a stretch factor
  (×1.25 to ×3). Every next-due date slides further out, so overdue alerts
  calm down while you travel. Turn it off when you get home to snap the
  schedule back to normal.
- **Light notes** — a free-text field per plant ("Bright, indirect; east
  window"). Where scheduling helps with *when*, light notes help with *where*
  to put the pot.
- **Education-level care links** — links to university-extension and
  botanical-garden houseplant references. The app schedules chores; it does
  not diagnose sick plants. Educational information only — never a
  substitute for a hands-on check with a local garden center, nursery, or
  cooperative extension office.

## Tests

The due-date math (leap years, month clamping, DST-safe day math, vacation
stretching) lives in a self-contained block inside `index.html` and is
covered by dependency-free JS tests:

```
node tests.js
```

Requires Node.js (any recent LTS). No packages to install.

## Files

| File         | What it is                                  |
| ------------ | ------------------------------------------- |
| `index.html` | The entire app (HTML + CSS + JS, one file)  |
| `tests.js`   | Dependency-free test runner for the core math |
| `LICENSE`    | MIT license                                 |
| `STATUS.md`  | Build/verification notes                    |

## Related

Distinct from our static **houseplant care pack**: that one is read-at-your-
own-pace care sheets; this is the ongoing scheduler that keeps nagging you
(warmly) day by day.

---

© 2026 Asdale Dynamics, LLC · MIT License
