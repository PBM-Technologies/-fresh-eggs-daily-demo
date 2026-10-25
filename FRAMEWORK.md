# Fresh Eggs Daily: Product Framework

## Purpose
Build a production-capable, mobile-first consumer application. This repository currently contains an earlier demo page; it is NOT the production application.

## Product modules
1. auth and flock households
2. chicken and flock profiles
3. daily egg collection and inventory
4. coop chores and schedules
5. feed and supplies inventory
6. health and biosecurity logs
7. brooder and incubation
8. education and recipes
9. shop and subscriptions
10. notifications

## Navigation / route inventory
- `/`
- `/flock`
- `/flock/:birdId`
- `/eggs`
- `/eggs/history`
- `/coop`
- `/care`
- `/feed`
- `/brooder`
- `/learn`
- `/recipes`
- `/shop`
- `/account`

## Data domains
- `users`
- `households`
- `household_members`
- `flocks`
- `birds`
- `bird_health_events`
- `egg_collections`
- `egg_inventory`
- `coops`
- `chore_templates`
- `chore_occurrences`
- `feed_inventory`
- `feed_logs`
- `feeding_logs`
- `treat_logs`
- `household_people`
- `incubation_batches`
- `hatch_events`
- `articles`
- `recipes`
- `products`
- `orders`
- `subscriptions`
- `notifications`

## Architecture
- Frontend: Next.js App Router + TypeScript + responsive design system, server-rendered public pages and authenticated private pages.
- Backend: versioned route handlers/service layer, schema validation, centralized authorization, audit logging.
- Database: PostgreSQL, tenant-scoped records, migrations, constraints, backups.
- Auth: managed provider, verified identity, role-based household membership; no passwords stored by application.
- Storage: private pet/flock records and images with signed access; public marketing assets separate.
- Jobs: scheduled reminders, subscription lifecycle and notification queues with retry/idempotency.
- Integrations: adapters behind interfaces; no assumed live credentials or unverified partnerships.
- Observability: errors, traces, conversion analytics and privacy-aware audit events.

## Release sequence
1. Foundation: project scaffolding, auth, database migrations, design tokens, CI, deployment environments.
2. First useful workflow: create a flock, add birds, log eggs, complete chores.
3. Expand: egg trends, health logs, feed inventory, incubation.
4. Commerce: provider integrations, billing, fulfillment and returns, customer support.
5. Beta: consent, privacy/security review, accessibility, tests, analytics, real-device testing.

## Acceptance gates
- Functional desktop and mobile flows, not just static previews.
- User can create/edit/delete their own data; cross-household access is denied.
- Input validation, empty/loading/error states, accessibility and automated tests.
- No production claims until integration, security and end-to-end tests pass.
- Obtain approval for visual design before production rollout.

## Ownership and boundaries
Fresh Eggs Daily branded product. Product education and merchandising remain aligned with Fresh Eggs Daily; PBM Technologies is the software development partner.
Keep user data, branding, billing, analytics and administrator roles isolated between the two applications. Reuse code packages only, never silently share consumer data.

## Status
Phase 1 (local-first web app) is implemented in this repo. See README.md for how to run and deploy.

Implemented:
- Vite + React + TypeScript (strict) single-page app, hash routed with the full route inventory above, built to one self-contained `dist/index.html`.
- Modules 2 to 8 and 10 working end to end on the device: flocks and hen profiles, egg logging and history (trends, top layers, eggs on hand, sales, costs, cost per dozen, profit), coop chores with recurrence and streaks, health and biosecurity log with reminders, feed inventory with days remaining, incubation and brooder guide, Learn and Recipes content, in-app reminders center.
- Module 1 as a local household profile (no passwords); module 9 as Shop category links out to the Fresh Eggs Daily site.
- Persistence behind a `Store`/`DataAdapter` interface (`src/data/`) with a guarded localStorage adapter; JSON backup, CSV export, import and delete-all.
- `database/0002_flock.sql` defines household-scoped Postgres tables matching the domain types.
- Vitest unit tests for the data layer and computed logic; Playwright click-through script; GitHub Pages workflow; PWA manifest and service worker when served over http(s).

Still pending before production (see Acceptance gates):
- Real auth (managed provider, verified identity, household roles) and cross-household access denial on a server.
- Backend service layer, Postgres deployment, signed image storage, audit logging, backups.
- Commerce: catalog, cart, subscriptions, orders and fulfillment integrations.
- Push and email notifications and scheduled reminder jobs.
- Privacy and security review, analytics, real-device testing, and visual design approval from Fresh Eggs Daily.
