# RideScreen (working name) — clickable prototype

Rideshare tablet advertising: drivers sign up, get activated with a photo of their mounted tablet,
the tablet loops ads with a QR offer, and drivers send a weekly report that is checked before a
week is marked payment eligible.

Prototype only. No server: all data stays in the browser. Do not enter real personal details.

## Commands (run inside `app/`)

| Command | Does |
|---|---|
| `npm install` | Installs dependencies |
| `npm run dev` | Starts the app for development (http://localhost:5173) |
| `npm test` | Runs the unit tests |
| `npm run lint` | Lints the code |
| `npm run build` | Type-checks and builds to `dist/`, with the offline service worker |
| `npm run preview` | Serves the built app (use this to try offline) |

## Layout

- `src/config.ts` — product name and defaults
- `src/data/` — data store, sample data, session
- `src/checks/` — weekly report check
- `src/features/` — `driver`, `admin`, `player` screens
- `src/lib/` — small helpers (dates, ABN, QR link, files, router)

## Preview

Every push to `main` builds the app and publishes it to GitHub Pages
(`.github/workflows/pages.yml`). Each browser keeps its own demo data; Admin → Settings →
"Reset demo data" starts clean.
