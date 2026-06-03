# Diet Planner Recipe Review

Mobile-first V3 recipe review card for Luke confirmation.

This repo currently contains a static review screen:

- `index.html`
- `styles.css`
- `app.js`
- `data/recipe-index.json`
- `assets/poached-eggs-hero.png`

Plain English: this is the food-profile view for reviewing recipes on a phone. It shows the menu description, suitability, per-person nutrition, recipe preview, shopping costs, proof summary, a checked review image, and local-only Pass/Fail buttons.

The design has moved from warm meal-kit colours to a sharper minimalist style: white cards, black header, electric green pass state, coral fail state, and blue proof/status accents.

Important boundary:

- Pass and Fail only save browser-local UI state.
- They do not approve a recipe.
- They do not create `human_review.json`.
- They do not create planner rows, shopping plans, calendar events, Google output, live receipts, or automation output.

Current data state:

- 3 recipes in the review index.
- 0 approved.
- 0 needs review.
- 3 blocked.
- Poached Eggs is blocked by `CULINARY_BASELINE_MISSING` because the technical proof omitted butter, seasoning, and chef edge.

Review image rule:

- Generated food images are allowed for final review only after the technical recipe bundle passes.
- The image must show only approved recipe foods.
- Any image that adds extra ingredients must be rejected.
- The policy copy is in `docs/final_review_visual_policy.json`.

Culinary baseline rule:

- Technically valid but bland recipes are blocked before Luke review.
- Eggs on toast must be rebuilt through blueprint and datasheet if it needs butter, salt, pepper, or another finish.
- The policy copy is in `docs/culinary_baseline_policy.json`.
