# Diet Planner V4 App Shell

Status date: 2026-06-28

Purpose: local V4 replacement shell for the existing GitHub Pages Diet Planner app.

Plain English: this is the new front door. It keeps the old app connection pattern, but uses the new V4 visual style. It does not import old V3 recipes into the V4 database.

Planner builder blueprint:

- `../PLANNER_BUILDER_BLUEPRINT.md`

## Routes

- `#/` - Home
- `#/acceptance` - Acceptance queue
- `#/collection` - Approved recipe collection
- `#/collection/recipes` - Approved recipe collection
- `#/collection/ingredients` - Ingredients and SKU database
- `#/shopping` - Recipe-level shopping data
- `#/profiles` - Household profiles and local draft changes
- `#/planner` - Draft-only planner week builder

Old V3 aliases are supported:

- `#/recipes` routes to Acceptance
- `#/database` routes to Collection
- `#/ingredients`, `#/ingredient`, `#/skus`, and `#/sku` route to the Ingredients/SKU database

## Data Connections

The app reads:

- `data/recipe-index.json`
- `data/profile-index.json`
- `data/planner-week-template.json`
- `data/review-postbox-config.json`

Current V4 recipe database state:

- `0` accepted recipes are currently clean
- `3` old passed recipes have been moved to change/recheck
- `0` clean pending Acceptance items
- `13` repair queue rows are active, covering Sarah rice repair, dinner fruit/veg repair, adult-only lane repair, and Luke change requests
- new recipe generation is active by Luke override, but old repair rows remain blocked from planner and shopping use
- recipe-level shopping rows are only shown for accepted recipes; accumulated weekly shopping remains a future planner job

V4 review decisions use a V4-specific local storage key so old V3 browser decisions cannot make a pending V4 recipe look accepted:

- `v4_recipe_review_decisions`

Profile draft notes still use the old draft key during the transition so existing profile/search notes are not stranded:

- `v3_profile_draft_changes`

Planner preference changes are browser-local drafts only. They label the weekly holes, but do not select recipes or create outputs:

- `v4_planner_preference_draft`

## Boundaries

This app does not write recipe truth directly.

Acceptance decisions are sent to the local V4 decision inbox. A Codex import job validates them, runs the recipe gates, then updates the app database. If the local inbox is unavailable, the app copies fallback JSON for Codex import.

Profile changes are browser-local drafts only until a Codex import job validates and writes them.

The weekly planner route is a draft-only calendar builder. It can choose the week template, toggle required slots, choose people, and mark slot requirement chips. It does not pick recipes, create calendar output, build accumulated shopping, write approval files, or hand anything to Google Calendar.

## Local Preview

Serve from `V4`:

```powershell
python V4\server\v4_local_app_server.py --host 127.0.0.1 --port 8044
```

Open:

```text
http://127.0.0.1:8044/app/index.html#/
```
