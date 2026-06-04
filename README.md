# Diet Planner V3 App

Mobile-first V3 app launcher and recipe review card for Luke confirmation.

This repo currently contains a static app:

- `index.html`
- `styles.css`
- `app.js`
- `data/recipe-index.json`
- `assets/poached-eggs-hero.png`

Plain English: the root page is a simple front door with three options: Profiles, Recipe Review, and Weekly Planner. Recipe Review is the food-profile view for reviewing recipes on a phone. Profiles and Weekly Planner are coming-soon placeholders.

Routes:

- `#/` or no hash: Home.
- `#/recipes`: Recipe Review.
- `#/profiles`: Profiles coming soon.
- `#/planner`: Weekly Planner coming soon.

The design has moved from warm meal-kit colours to a sharper minimalist style: white cards, black header, electric green pass state, coral fail state, and blue proof/status accents.

Important boundary:

- Pass and Fail only save browser-local UI state.
- They do not approve a recipe.
- They do not create `human_review.json`.
- They do not create planner rows, shopping plans, calendar events, Google output, live receipts, or automation output.
- Profiles and Weekly Planner do not expose real profile data or planning controls yet.

Current data state:

- 3 recipes in the review index.
- 0 approved.
- 1 needs review.
- 2 blocked.
- Poached Eggs is a source-authorised review recipe, but it is not planner-approved because `human_review.json` is absent.

Review image rule:

- Generated food images are allowed for final review only after the technical recipe bundle passes.
- The image must show only approved recipe foods.
- Any image that adds extra ingredients must be rejected.
- The policy copy is in `docs/final_review_visual_policy.json`.

Culinary baseline rule:

- Technically valid but bland recipes are blocked before Luke review.
- Eggs on toast must be rebuilt through blueprint and datasheet if it needs butter, salt, pepper, or another finish.
- The policy copy is in `docs/culinary_baseline_policy.json`.
