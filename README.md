# Diet Planner Recipe Review

Mobile-first V3 recipe review card for Luke confirmation.

This repo currently contains a static review screen:

- `index.html`
- `styles.css`
- `app.js`
- `data/recipe-index.json`
- `assets/poached-eggs-hero.png`

Plain English: this is the food-profile view for reviewing recipes on a phone. It shows the menu description, suitability, per-person nutrition, recipe preview, shopping costs, proof summary, and local-only Pass/Fail buttons.

Important boundary:

- Pass and Fail only save browser-local UI state.
- They do not approve a recipe.
- They do not create `human_review.json`.
- They do not create planner rows, shopping plans, calendar events, Google output, live receipts, or automation output.

Current data state:

- 3 recipes in the review index.
- 0 approved.
- 1 needs review.
- 2 blocked.
- Poached Eggs remains `needs_review`.
