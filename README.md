# Fresh Eggs Daily: flock companion app

A mobile-first web app for backyard chicken keepers, built for the Fresh Eggs Daily brand (PBM Technologies is the development partner). It tracks hens, eggs, chores, health, feed and hatches, and it includes the features competitors put behind paywalls (cost per dozen, egg sales, multiple flocks, journals) for free.

This phase runs entirely in the browser. There is no account, server or payment system yet; data is saved on the device.

## What is in the app

| Route | What it does |
| --- | --- |
| `#/` | Today: hens, eggs today, chore progress, what is due, egg snapshot, a Learn tip. Empty state offers **Load sample flock** (Daisy, Pepper, Olive plus two weeks of logs), removable in one tap. |
| `#/flock`, `#/flock/:birdId` | Hen profiles: name, breed picker, hatch date and computed age, color, compressed photo, status (active, rehomed, deceased), notes. Detail page with egg totals, health log, edit and delete. Multiple flocks. |
| `#/eggs` | Fast logging with a big +/- counter, optional hen attribution, backdating, damaged count and notes. |
| `#/eggs/history` | Daily, weekly and monthly SVG bar charts, laying trend, top layers, eggs on hand, sales and give-aways, costs, cost per dozen and profit. |
| `#/coop` | Chore templates (daily, weekly, monthly, seasonal) seeded with sensible defaults, today's checklist with carry-over, streak. |
| `#/care` | Health and biosecurity log per hen or flock, quarantine end dates, follow-up reminders. States clearly that the app does not give veterinary diagnosis. |
| `#/feed` | Supplies with quantity, unit and daily usage, days remaining, low-stock warnings, restock and recount log. |
| `#/brooder` | Incubation batches with day counter, candling on days 7 and 14, lockdown day 18, hatch day 21, hatch results and rate, plus a brooder temperature guide. |
| `#/learn`, `#/recipes` | 11 original problem-first guides and 8 original egg recipes. |
| `#/shop` | Fresh Eggs Daily product categories linking to fresheggsdaily.com. Ordering happens on the Fresh Eggs Daily site. |
| `#/account` | Household name, flocks, JSON backup, CSV export (eggs, sales, costs), restore from backup, delete all data. |

The bell in the top bar is the in-app reminders center: chores due, care follow-ups, quarantine ends, low feed, candling, lockdown and hatch days.

## Run it

```bash
npm install
npm run dev        # local dev server
npm test           # vitest unit tests (data layer and computed logic)
npm run typecheck  # tsc --noEmit
npm run build      # emits ONE self-contained file: dist/index.html
npm run e2e        # Playwright click-through at 390x844 (needs: pip install playwright && python -m playwright install chromium)
```

`dist/index.html` works on its own: open it from disk, email it, or drop it on any static host. Hash routes (`#/flock`) mean no server rewrites are needed.

## Deploy (GitHub Pages)

`.github/workflows/pages.yml` runs tests, builds, and deploys `dist/` with `actions/upload-pages-artifact` and `actions/deploy-pages` on every push to `main`.

One-time setup: in the GitHub repo go to **Settings > Pages > Build and deployment** and set **Source** to **GitHub Actions**. Without that the deploy job fails.

On Pages the app also registers a manifest and a service worker (`dist/manifest.webmanifest`, `dist/sw.js`, `dist/icon.svg`) so it can be installed to the home screen and reopened offline. When opened as a plain file those are skipped, so the single file never breaks.

## Code map

- `src/contracts/domain.ts`: shared types (original contracts kept; flock domain added).
- `src/data/`: persistence. `repository.ts` defines `Store<T>` (`list`, `get`, `upsert`, `remove`, `replaceAll`) and `DataAdapter`. `localAdapter.ts` implements it on `localStorage`; `storage.ts` wraps every read and write in try/catch and falls back to memory when storage is blocked or full. Swap in a Firebase or Postgres adapter by implementing `DataAdapter`.
- `src/logic/`: pure, tested functions (dates, chore recurrence, eggs and economics, feed, incubation, care, reminders).
- `src/screens/`, `src/components/`: React UI. `src/content/`: guides, recipes, shop categories, breeds.
- `database/0001_identity.sql`, `database/0002_flock.sql`: Postgres schema the future backend should match.
- `demo/index.html`: the original one-page concept demo, kept for reference.

## Not live yet

- Real accounts and sign-in, shared households, cross-device sync (data is per browser until exported).
- Backend API, Postgres, image storage, audit logging.
- Commerce: product catalog, cart, subscriptions and orders (Shop links out to the Fresh Eggs Daily site; category deep links still need confirming).
- Push or email notifications (reminders are in-app only).
- Brand visual approval: colors come from the earlier demo palette because the Fresh Eggs Daily site could not be reached during this build.
