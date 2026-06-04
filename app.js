const REPO_URL = "https://github.com/LAPrice90/PA";
const DECISION_KEY = "v3_recipe_review_decisions";
const PROFILE_DRAFT_KEY = "v3_profile_draft_changes";

const FAIL_REASONS = {
  taste_food_idea_wrong: "Taste or food idea wrong",
  portion_wrong: "Portion wrong",
  method_cooking_flow_wrong: "Method or cooking flow wrong",
  shopping_ingredients_wrong: "Shopping or ingredients wrong",
  nutrition_target_wrong: "Nutrition or target wrong",
  layout_readability_wrong: "Layout or readability wrong",
  other_notes: "Other notes",
};

const state = {
  index: null,
  profileIndex: null,
  selectedId: "",
  selectedDatabaseId: "",
  selectedShoppingId: "",
  selectedPerson: "Luke",
  filter: "all",
  databaseFilter: "all",
  route: "home",
  decisions: loadDecisions(),
  profileDrafts: loadProfileDrafts(),
  activeProfileEdit: null,
  profileSkuQuery: "",
};

const els = {
  appTitle: document.querySelector("#app-title"),
  homeView: document.querySelector("#home-view"),
  recipesView: document.querySelector("#recipes-view"),
  databaseView: document.querySelector("#database-view"),
  shoppingView: document.querySelector("#shopping-view"),
  profilesView: document.querySelector("#profiles-view"),
  plannerView: document.querySelector("#planner-view"),
  databaseDataStatus: document.querySelector("#database-data-status"),
  shoppingDataStatus: document.querySelector("#shopping-data-status"),
  databaseFilters: document.querySelector("#database-filters"),
  databaseList: document.querySelector("#database-list"),
  databaseDetail: document.querySelector("#database-detail"),
  shoppingRecipeList: document.querySelector("#shopping-recipe-list"),
  shoppingDetail: document.querySelector("#shopping-detail"),
  profileDataStatus: document.querySelector("#profile-data-status"),
  profileTabs: document.querySelector("#profile-tabs"),
  profileContent: document.querySelector("#profile-content"),
  profileSkuSearch: document.querySelector("#profile-sku-search"),
  profileSkuResults: document.querySelector("#profile-sku-results"),
  profileDraftQueue: document.querySelector("#profile-draft-queue"),
  dataStatus: document.querySelector("#data-status"),
  profile: document.querySelector("#recipe-profile"),
  recipeList: document.querySelector("#recipe-list"),
  queueSummary: document.querySelector("#queue-summary"),
  reviewCount: document.querySelector("#review-count"),
  decisionCopy: document.querySelector("#decision-copy"),
  failReason: document.querySelector("#fail-reason"),
  reviewNotes: document.querySelector("#review-notes"),
  copyReviewDecision: document.querySelector("#copy-review-decision"),
  passButton: document.querySelector("#pass-recipe"),
  failButton: document.querySelector("#fail-recipe"),
  nextButton: document.querySelector("#next-recipe"),
  previousButton: document.querySelector("#previous-recipe"),
  filters: [...document.querySelectorAll(".filter-pill")],
};

const routeTitles = {
  home: "Diet Planner",
  recipes: "Recipe Review",
  database: "Recipe Database",
  shopping: "Shopping List",
  profiles: "Profiles",
  planner: "Weekly Planner",
};

function routeFromHash() {
  const hash = window.location.hash.replace(/^#\/?/, "").trim().toLowerCase();
  if (hash === "recipes") return "recipes";
  if (hash === "database") return "database";
  if (hash === "shopping") return "shopping";
  if (hash === "profiles") return "profiles";
  if (hash === "planner") return "planner";
  return "home";
}

function showRoute(route) {
  state.route = route;
  document.body.dataset.route = route;
  els.appTitle.textContent = routeTitles[route] || routeTitles.home;
  document.title = route === "home" ? "Diet Planner V3" : `${routeTitles[route]} - Diet Planner V3`;
  [
    ["home", els.homeView],
    ["recipes", els.recipesView],
    ["database", els.databaseView],
    ["shopping", els.shoppingView],
    ["profiles", els.profilesView],
    ["planner", els.plannerView],
  ].forEach(([name, element]) => {
    if (element) element.classList.toggle("is-hidden", name !== route);
  });
  if (route === "recipes" && state.index) renderAll();
  if (route === "database" && state.index) renderDatabase();
  if (route === "shopping" && state.index) renderShoppingMenu();
  if (route === "profiles" && state.profileIndex) renderProfiles();
}

function loadDecisions() {
  try {
    return JSON.parse(localStorage.getItem(DECISION_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveDecisions() {
  localStorage.setItem(DECISION_KEY, JSON.stringify(state.decisions));
}

function loadProfileDrafts() {
  try {
    const drafts = JSON.parse(localStorage.getItem(PROFILE_DRAFT_KEY) || "[]");
    return Array.isArray(drafts) ? drafts : [];
  } catch {
    return [];
  }
}

function saveProfileDrafts() {
  localStorage.setItem(PROFILE_DRAFT_KEY, JSON.stringify(state.profileDrafts));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function number(value, places = 1) {
  const parsed = Number(value || 0);
  if (Number.isInteger(parsed)) return String(parsed);
  return parsed.toFixed(places).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function money(value) {
  return `GBP ${Number(value || 0).toFixed(2)}`;
}

function showCopyFallback(container, jsonText) {
  if (!container) return;
  const existing = container.querySelector("[data-copy-fallback]");
  if (existing) existing.remove();
  const fallback = document.createElement("textarea");
  fallback.className = "copy-fallback";
  fallback.dataset.copyFallback = "true";
  fallback.readOnly = true;
  fallback.value = jsonText;
  container.appendChild(fallback);
  fallback.focus();
  fallback.select();
}

function plainText(markdown) {
  return String(markdown || "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();
}

function firstParagraph(markdown, fallback) {
  const lines = plainText(markdown)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const title = lines[0] || "";
  return lines.find((line) => line !== title && !line.includes(":") && line.length > 24) || fallback;
}

function sectionContentLines(markdown, heading) {
  const lines = String(markdown || "").split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start === -1) return [];
  const output = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (line.startsWith("## ")) break;
    output.push(line);
  }
  return output;
}

function ingredientGroups(markdown) {
  const lines = sectionContentLines(markdown, "Ingredients");
  const groups = [];
  let current = { title: "Ingredients", items: [] };
  lines.forEach((line) => {
    if (!line) return;
    if (line.startsWith("### ")) {
      if (current.items.length) groups.push(current);
      current = { title: line.replace(/^###\s+/, ""), items: [] };
      return;
    }
    if (line.startsWith("- ")) current.items.push(line.replace(/^- /, ""));
  });
  if (current.items.length) groups.push(current);
  return groups;
}

function methodSteps(markdown) {
  const lines = sectionContentLines(markdown, "Method");
  const steps = [];
  let current = null;
  let mode = "instruction";
  lines.forEach((line) => {
    if (!line) return;
    if (line.startsWith("### ")) {
      if (current) steps.push(current);
      current = {
        title: line.replace(/^###\s+/, "").replace(/^\d+\.\s*/, ""),
        instructions: [],
        ingredients: [],
      };
      mode = "instruction";
      return;
    }
    if (!current) return;
    if (line.toLowerCase() === "uses:") {
      mode = "ingredients";
      return;
    }
    if (line.startsWith("- ")) {
      const item = line.replace(/^- /, "");
      if (mode === "ingredients") current.ingredients.push(item);
      else current.instructions.push(item);
      return;
    }
    current.instructions.push(line);
  });
  if (current) steps.push(current);
  return steps.filter((step) => step.title || step.instructions.length || step.ingredients.length);
}

function statusLabel(recipe) {
  if (recipe.review_quality?.status === "BLOCK") return "Needs recipe edit";
  if (recipe.status === "approved") return "Confirmed";
  if (recipe.status === "needs_review") return "Needs review";
  if (recipe.status === "needs_repair") return "Needs repair";
  return "Blocked";
}

function statusTone(recipe) {
  if (recipe.status === "approved") return "good";
  if (recipe.status === "needs_review") return "review";
  if (recipe.status === "needs_repair") return "blocked";
  return "blocked";
}

function recipeDecision(recipe) {
  const raw = state.decisions[recipe.recipe_id] || "";
  if (!raw) return {};
  if (typeof raw === "string") {
    return {
      decision: raw,
      reason_code: raw === "fail" ? "other_notes" : "accepted",
      reason_label: raw === "fail" ? FAIL_REASONS.other_notes : "Accepted",
      notes: "",
    };
  }
  return {
    decision: raw.decision || "",
    reason_code: raw.reason_code || (raw.decision === "fail" ? "other_notes" : "accepted"),
    reason_label: raw.reason_label || (raw.decision === "fail" ? FAIL_REASONS[raw.reason_code] || FAIL_REASONS.other_notes : "Accepted"),
    notes: raw.notes || "",
    updated_at: raw.updated_at || "",
  };
}

function filteredRecipes() {
  if (!state.index) return [];
  return state.index.recipes.filter((recipe) => state.filter === "all" || recipe.status === state.filter);
}

function currentRecipe() {
  if (!state.index) return null;
  return state.index.recipes.find((recipe) => recipe.recipe_id === state.selectedId) || filteredRecipes()[0] || state.index.recipes[0] || null;
}

function reviewQueueStatus() {
  const index = state.index || {};
  const total = Number(index.recipe_count || 0);
  const needsReview = Number(index.needs_review_count || 0);
  const needsRepair = Number(index.needs_repair_count || 0);
  const blocked = Number(index.blocked_count || 0);
  const approved = Number(index.approved_count || 0);
  if (!total) {
    return {
      mode: "empty",
      title: "No recipes in review",
      copy: "There are no recipes in the review queue yet.",
      total,
      needsReview,
      needsRepair,
      blocked,
      approved,
    };
  }
  if (needsReview === 0 && needsRepair === 0 && blocked === 0) {
    return {
      mode: "complete",
      title: "All recipes complete",
      copy: "Every visible recipe has been decided and nothing is waiting for repair or technical checks.",
      total,
      needsReview,
      needsRepair,
      blocked,
      approved,
    };
  }
  if (needsReview === 0) {
    return {
      mode: "work_remaining",
      title: "Review decisions complete",
      copy: "No recipes are waiting for review, but some recipes still need repair or technical checks before they can be used.",
      total,
      needsReview,
      needsRepair,
      blocked,
      approved,
    };
  }
  return null;
}

function shouldShowReviewStatusPage(status) {
  return Boolean(status) && (state.filter === "all" || state.filter === "needs_review");
}

function approvedRecipes() {
  if (!state.index) return [];
  return state.index.recipes.filter((recipe) => recipe.status === "approved");
}

function mealTypeLabel(value) {
  return String(value || "recipe")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function databaseMealTypes() {
  return [...new Set(approvedRecipes().map((recipe) => recipe.meal_type || "recipe"))].sort((a, b) =>
    mealTypeLabel(a).localeCompare(mealTypeLabel(b)),
  );
}

function filteredDatabaseRecipes() {
  const recipes = approvedRecipes();
  if (state.databaseFilter === "all") return recipes;
  return recipes.filter((recipe) => (recipe.meal_type || "recipe") === state.databaseFilter);
}

function currentDatabaseRecipe() {
  const recipes = filteredDatabaseRecipes();
  return (
    recipes.find((recipe) => recipe.recipe_id === state.selectedDatabaseId) ||
    recipes[0] ||
    approvedRecipes().find((recipe) => recipe.recipe_id === state.selectedDatabaseId) ||
    approvedRecipes()[0] ||
    null
  );
}

function currentShoppingRecipe() {
  const recipes = approvedRecipes();
  return recipes.find((recipe) => recipe.recipe_id === state.selectedShoppingId) || recipes[0] || null;
}

function nutritionHeadline(recipe) {
  const totals = recipe.person_totals || {};
  const preferred = totals.Luke ? "Luke" : Object.keys(totals)[0];
  if (!preferred) return "Nutrition saved";
  const row = totals[preferred] || {};
  return `${preferred}: ${number(row.calories)} kcal / ${number(row.protein_g)}g protein`;
}

function hasSavedRecipeCost(recipe) {
  const value = Number(recipe?.shopping_total_used_cost_gbp);
  return Number.isFinite(value);
}

function recipeCostHeadline(recipe) {
  return hasSavedRecipeCost(recipe) ? `Total recipe cost ${money(recipe.shopping_total_used_cost_gbp)}` : "Total cost not saved";
}

function approvedCard(recipe, active, idAttribute) {
  const image = heroImage(recipe);
  return `
    <button class="database-card ${active ? "active" : ""}" type="button" ${idAttribute}="${escapeHtml(recipe.recipe_id)}">
      <span class="database-card-image" ${image ? `style="background-image: url('${image}')"` : ""}>
        ${image ? "" : `<span class="database-image-fallback"></span>`}
      </span>
      <span class="database-card-copy">
        <strong>${escapeHtml(recipe.title)}</strong>
        <em>${escapeHtml(mealTypeLabel(recipe.meal_type))} - ${escapeHtml(recipe.timing?.total_minutes ? `${recipe.timing.total_minutes} min` : "Time saved")}</em>
        <small>${escapeHtml((recipe.people || []).join(", ") || "People saved")}</small>
        <small>${escapeHtml(nutritionHeadline(recipe))}</small>
        <small>${escapeHtml(recipeCostHeadline(recipe))}</small>
      </span>
    </button>
  `;
}

function heroImage(recipe) {
  const visual = recipe.review_visual || {};
  const assetPath = String(visual.asset_path || "").trim();
  const truthStatus = String(visual.visual_truth_check?.status || "").trim();
  if (visual.status === "approved_for_review_display" && truthStatus === "PASS" && assetPath) {
    return `./${assetPath.replace(/^\.\//, "")}`;
  }
  return "";
}

function recipeTags(recipe) {
  const tags = [
    recipe.meal_type || "Recipe",
    recipe.timing?.total_minutes ? `${recipe.timing.total_minutes} min` : "",
    (recipe.people || []).length ? `${recipe.people.length} people` : "",
    statusLabel(recipe),
  ].filter(Boolean);
  return tags.slice(0, 4);
}

function slotFitLabel(recipe) {
  const status = recipe.slot_fit?.overall_status || "";
  const labels = {
    PASS: "Fits target",
    LIGHT_ALLOWED: "Light - balance day",
    OVER_TARGET_ALLOWED: "Over target - allowed",
    BLOCK: "Target blocked",
  };
  return labels[status] || "Not measured";
}

function dayBalanceLabel(recipe) {
  const requirements = Array.isArray(recipe.day_balance_requirements) ? recipe.day_balance_requirements : [];
  if (!requirements.length) return "No top-up needed";
  const people = [...new Set(requirements.map((row) => row.person).filter(Boolean))];
  if (!people.length) return "Top-up needed later";
  return `${people.join(" and ")} need top-up later`;
}

function suitabilityItems(recipe) {
  const flags = recipe.binary_flags || {};
  const items = [];
  items.push({ label: "Meal", value: recipe.meal_type || "Unclassified" });
  items.push({ label: "Meal target", value: slotFitLabel(recipe) });
  items.push({ label: "Balance", value: dayBalanceLabel(recipe) });
  items.push({ label: "Time", value: recipe.timing?.total_minutes ? `${recipe.timing.total_minutes} minutes` : "Not proven" });
  items.push({ label: "Cooking", value: flags.serve_immediately ? "Serve fresh" : flags.stores_for_later ? "Stores for later" : "Check notes" });
  items.push({ label: "Shelf", value: recipe.status === "needs_review" ? "Waiting for Luke" : statusLabel(recipe) });
  items.push({ label: "Planner", value: recipe.algorithmic_planning_allowed ? "Allowed" : "Not allowed yet" });
  return items;
}

function renderHero(recipe) {
  const image = heroImage(recipe);
  const decision = recipeDecision(recipe);
  const localDecisionLabel = decision.decision === "pass" ? "Locally passed" : decision.decision === "fail" ? "Locally failed" : "";
  return `
    <section class="hero-card ${statusTone(recipe)}">
      <div class="hero-image" ${image ? `style="background-image: url('${image}')"` : ""}>
        ${image ? "" : `<div class="fallback-plate"><span></span><span></span></div>`}
        <div class="hero-shine"></div>
      </div>
      <div class="hero-copy">
        <div class="hero-row">
          <span class="state-pill ${statusTone(recipe)}">${escapeHtml(statusLabel(recipe))}</span>
          ${localDecisionLabel ? `<span class="state-pill chosen">${escapeHtml(localDecisionLabel)}</span>` : ""}
        </div>
        <h2>${escapeHtml(recipe.title)}</h2>
        <p>${escapeHtml(firstParagraph(recipe.recipe_card_markdown, "A recipe profile ready for review."))}</p>
        <div class="tag-row">
          ${recipeTags(recipe).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
        </div>
        <div class="cost-headline">
          <span>Total recipe cost</span>
          <strong>${escapeHtml(hasSavedRecipeCost(recipe) ? money(recipe.shopping_total_used_cost_gbp) : "Not saved")}</strong>
        </div>
      </div>
    </section>
  `;
}

function renderSuitability(recipe) {
  return `
    <section class="story-section">
      <h3>Meal Fit</h3>
      <div class="suitability-list">
        ${suitabilityItems(recipe)
          .map(
            (item) => `
              <div class="suitability-item">
                <span>${escapeHtml(item.label)}</span>
                <strong>${escapeHtml(item.value)}</strong>
              </div>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderNutrition(recipe) {
  const people = Object.keys(recipe.person_totals || {});
  const rows = [
    ["Kcal", "calories", (value) => `${number(value)} kcal`],
    ["Protein", "protein_g", (value) => `${number(value)}g`],
    ["Carbs", "carbs_g", (value) => `${number(value)}g`],
    ["Fat", "fat_g", (value) => `${number(value)}g`],
    ["Cost", "cost_gbp", money],
    ["Fullness", "portion_fullness_points", number],
  ];
  if (!people.length) {
    return `
      <section class="story-section">
        <h3>Nutrition</h3>
        <p class="friendly-empty">No source-authorised nutrition table is saved yet.</p>
      </section>
    `;
  }
  return `
    <section class="story-section nutrition-story">
      <div class="section-title-row">
        <h3>Nutrition</h3>
        <span>Per person</span>
      </div>
      <div class="nutrition-table-wrap">
        <table class="nutrition-table">
          <thead>
            <tr>
              <th>Value</th>
              ${people.map((person) => `<th>${escapeHtml(person)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                ([label, key, formatter]) => `
                  <tr>
                    <th>${escapeHtml(label)}</th>
                    ${people.map((person) => `<td>${escapeHtml(formatter(recipe.person_totals[person]?.[key]))}</td>`).join("")}
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderRecipePreview(recipe) {
  const ingredients = ingredientGroupsFromShoppingRows(recipe) || ingredientGroups(recipe.recipe_card_markdown);
  const method = methodSteps(recipe.recipe_card_markdown);
  return `
    <section class="story-section recipe-story">
      <h3>Recipe Card</h3>
      <div class="recipe-preview">
        <div>
          <h4>What goes in</h4>
          ${
            ingredients.length
              ? ingredients
                  .map(
                    (group) => `
                      <div class="ingredient-group">
                        <strong>${escapeHtml(group.title)}</strong>
                        <ul>
                          ${group.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
                        </ul>
                      </div>
                    `,
                  )
                  .join("")
              : `<p class="friendly-empty">No ingredient preview saved.</p>`
          }
        </div>
        <div>
          <h4>Cooking steps</h4>
          ${
            method.length
              ? `<div class="method-list">
                  ${method
                    .map(
                      (step, index) => `
                        <article class="method-step">
                          <span>${index + 1}</span>
                          <div>
                            <strong>${escapeHtml(step.title || `Step ${index + 1}`)}</strong>
                            ${step.instructions.length ? `<p>${escapeHtml(step.instructions.join(" "))}</p>` : ""}
                            ${
                              step.ingredients.length
                                ? `<div class="step-ingredients">
                                    <em>Uses</em>
                                    <ul>
                                      ${step.ingredients.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
                                    </ul>
                                  </div>`
                                : ""
                            }
                          </div>
                        </article>
                      `,
                    )
                    .join("")}
                </div>`
              : `<p class="friendly-empty">No method preview saved.</p>`
          }
        </div>
      </div>
    </section>
  `;
}

function ingredientGroupsFromShoppingRows(recipe) {
  const rows = Array.isArray(recipe.shopping_rows) ? recipe.shopping_rows : [];
  if (!rows.length) return null;
  const groups = new Map();
  rows.forEach((row) => {
    const title = row.ingredient_category || "Pantry";
    if (!groups.has(title)) groups.set(title, []);
    const quantity = row.needed_kitchen_display || `${number(row.needed_quantity)} ${row.needed_unit || ""}`.trim();
    groups.get(title).push(`${row.ingredient_name} - ${quantity}`);
  });
  return Array.from(groups.entries()).map(([title, items]) => ({ title, items }));
}

function shoppingTreatmentLabel(value) {
  const labels = {
    main_buy: "Main buy",
    pantry_check: "Pantry check",
    pantry_covered: "Pantry covered",
    tap: "No shop",
    not_required: "No shop",
  };
  return labels[value] || value || "Shopping";
}

function renderShopping(recipe) {
  const rows = recipe.shopping_rows || [];
  return `
    <section class="story-section shopping-story">
      <div class="section-title-row">
        <h3>Shopping</h3>
        <span>${escapeHtml(recipeCostHeadline(recipe))}</span>
      </div>
      ${
        rows.length
          ? `<div class="shopping-list">
              ${rows
                .map(
                  (row) => `
                    <div class="shopping-line">
                      <div>
                        <strong>${escapeHtml(row.ingredient_name)}</strong>
                        <span>${escapeHtml(row.ingredient_category || "Food")} - ${escapeHtml(shoppingTreatmentLabel(row.shopping_treatment))} - ${escapeHtml(row.purchase_display || row.pack_label || "pack")}</span>
                      </div>
                      <em>${escapeHtml(row.needed_kitchen_display || `${number(row.needed_quantity)} ${row.needed_unit || ""}`)} - ${money(row.estimated_used_cost_gbp)}</em>
                    </div>
                  `,
                )
                .join("")}
            </div>`
          : `<p class="friendly-empty">No recipe-level shopping list is ready yet.</p>`
      }
    </section>
  `;
}

function renderChefCheck(recipe) {
  const quality = recipe.review_quality || {};
  if (!quality.status) return "";
  const isBlocked = quality.status === "BLOCK";
  const issue = Array.isArray(quality.issues) && quality.issues.length ? quality.issues[0] : {};
  return `
    <section class="story-section chef-story ${isBlocked ? "blocked" : "passed"}">
      <div class="section-title-row">
        <h3>Chef Check</h3>
        <span>${escapeHtml(isBlocked ? "Needs edit" : "Passed")}</span>
      </div>
      <p>${escapeHtml(quality.plain_english_summary || "No chef check summary saved.")}</p>
      ${issue.expected_repair ? `<p class="repair-note">${escapeHtml(issue.expected_repair)}</p>` : ""}
    </section>
  `;
}

function renderProofSummary(recipe) {
  const proof = recipe.technical_proof || {};
  const counts = proof.source_authorised_counts || {};
  const sourceReady = proof.verdict === "PASS";
  const profileReady = proof.profile_rule_status === "PASS";
  const visual = recipe.review_visual || {};
  const visualReady = visual.status === "approved_for_review_display" && visual.visual_truth_check?.status === "PASS";
  const quality = recipe.review_quality || {};
  const qualityBlocked = quality.status === "BLOCK";
  const decisionText = recipe.human_review?.confirmed
    ? "Luke confirmed"
    : recipe.human_review?.failed
      ? "Luke rejected - repair needed"
      : "Needs Luke confirmation";
  return `
    <section class="story-section proof-story">
      <h3>Proof, Without The Noise</h3>
      <div class="proof-bites">
        <span class="${sourceReady ? "ok" : "wait"}">${sourceReady ? "Data proof passed" : "Data proof blocked"}</span>
        <span class="${profileReady ? "ok" : "wait"}">${profileReady ? "Profile rules passed" : "Profile rule blocked"}</span>
        <span class="${visualReady ? "ok" : "wait"}">${visualReady ? "Image truth passed" : "No checked image"}</span>
        <span class="${qualityBlocked ? "wait" : "ok"}">${qualityBlocked ? "Chef check blocked" : "Chef check clear"}</span>
        <span class="${recipe.algorithmic_planning_allowed ? "ok" : "wait"}">${escapeHtml(decisionText)}</span>
        <span>${escapeHtml(counts.nutrition || 0)} nutrition rows</span>
        <span>${escapeHtml(counts.cost || 0)} cost rows</span>
        <span>${escapeHtml(proof.profile_rule_checked_count || 0)} profile checks</span>
      </div>
    </section>
  `;
}

function renderProfile(recipe) {
  if (!recipe) {
    els.profile.innerHTML = `<div class="loading-card">No recipe data found.</div>`;
    return;
  }
  els.profile.innerHTML = [
    renderHero(recipe),
    renderSuitability(recipe),
    renderNutrition(recipe),
    renderRecipePreview(recipe),
    renderShopping(recipe),
    renderChefCheck(recipe),
    renderProofSummary(recipe),
  ].join("");
  renderDecisionPanel(recipe);
}

function renderReviewStatusPage(status) {
  const approvedAction =
    status.approved > 0
      ? `
        <a class="round-link dark" href="#/database">Open Recipe Database</a>
        <a class="round-link" href="#/shopping">Open Shopping List</a>
      `
      : `<a class="round-link dark" href="#/">Home</a>`;
  const repairAction =
    status.mode === "work_remaining"
      ? `
        ${status.needsRepair ? `<button class="mini-button" type="button" data-complete-filter="needs_repair">Show Needs Repair</button>` : ""}
        ${status.blocked ? `<button class="mini-button" type="button" data-complete-filter="blocked">Show Technical Blocks</button>` : ""}
      `
      : "";
  els.profile.innerHTML = `
    <section class="review-complete-card ${escapeHtml(status.mode)}">
      <div class="review-complete-mark">
        <span></span>
      </div>
      <h2>${escapeHtml(status.title)}</h2>
      <p>${escapeHtml(status.copy)}</p>
      <div class="review-complete-stats">
        <div><span>Total</span><strong>${escapeHtml(status.total)}</strong></div>
        <div><span>Approved</span><strong>${escapeHtml(status.approved)}</strong></div>
        <div><span>To Review</span><strong>${escapeHtml(status.needsReview)}</strong></div>
        <div><span>Repair</span><strong>${escapeHtml(status.needsRepair)}</strong></div>
        <div><span>Technical</span><strong>${escapeHtml(status.blocked)}</strong></div>
      </div>
      <div class="review-complete-actions">
        ${approvedAction}
        ${repairAction}
      </div>
    </section>
  `;
}

function renderReviewStatusDecisionPanel(status) {
  const panel = document.querySelector(".decision-panel");
  panel?.classList.remove("decision-made", "decision-pass", "decision-fail");
  panel?.classList.add("completion-mode");
  document.querySelector(".decision-panel [data-copy-fallback]")?.remove();
  els.decisionCopy.textContent =
    status.mode === "complete"
      ? "Review queue complete. Approved recipes are now available from Recipe Database."
      : status.mode === "work_remaining"
        ? "Review queue has no waiting recipes, but repair or technical checks remain."
        : "No recipes are currently in the review queue.";
  els.passButton.classList.remove("selected");
  els.failButton.classList.remove("selected");
  els.passButton.textContent = "Pass";
  els.failButton.textContent = "Fail";
  els.copyReviewDecision.disabled = true;
  els.copyReviewDecision.textContent = "Nothing to copy";
}

function renderDecisionPanel(recipe) {
  const decision = recipe ? recipeDecision(recipe) : {};
  document.querySelector(".decision-panel")?.classList.remove("completion-mode");
  document.querySelector(".decision-panel [data-copy-fallback]")?.remove();
  if (!recipe) {
    els.decisionCopy.textContent = "No recipe selected.";
    return;
  }
  if (els.failReason) {
    els.failReason.value = decision.reason_code && decision.reason_code !== "accepted" ? decision.reason_code : "taste_food_idea_wrong";
  }
  if (els.reviewNotes) {
    els.reviewNotes.value = decision.notes || "";
  }
  if (decision.decision === "pass") {
    els.decisionCopy.textContent = "Pass selected on this phone. Paste the copied JSON into Codex so it can be imported as `human_review.json`.";
  } else if (decision.decision === "fail") {
    els.decisionCopy.textContent = "Fail selected on this phone. Paste the copied JSON into Codex so it can create a repair ticket.";
  } else if (recipe.status === "needs_repair") {
    els.decisionCopy.textContent = "This recipe is already in repair. Copy a new decision only after a repaired version is shown.";
  } else if (recipe.status === "needs_review") {
    els.decisionCopy.textContent = "Choose Pass or Fail. The app will copy review JSON for Codex import.";
  } else {
    els.decisionCopy.textContent = "Review this profile. Import is still required before project truth changes.";
  }
  els.passButton.classList.toggle("selected", decision.decision === "pass");
  els.failButton.classList.toggle("selected", decision.decision === "fail");
  document.querySelector(".decision-panel")?.classList.toggle("decision-made", Boolean(decision.decision));
  document.querySelector(".decision-panel")?.classList.toggle("decision-pass", decision.decision === "pass");
  document.querySelector(".decision-panel")?.classList.toggle("decision-fail", decision.decision === "fail");
  els.passButton.textContent = decision.decision === "pass" ? "Pass selected" : "Pass";
  els.failButton.textContent = decision.decision === "fail" ? "Fail selected" : "Fail";
  if (els.copyReviewDecision) {
    els.copyReviewDecision.disabled = !decision.decision;
    els.copyReviewDecision.textContent =
      decision.decision === "pass" ? "Copy Pass JSON" : decision.decision === "fail" ? "Copy Fail JSON" : "Choose Pass or Fail first";
  }
}

function renderQueue() {
  const index = state.index;
  if (!index) return;
  els.queueSummary.innerHTML = `
    <span><strong>${index.recipe_count}</strong> total</span>
    <span><strong>${index.needs_review_count || 0}</strong> to review</span>
    <span><strong>${index.approved_count || 0}</strong> approved</span>
    <span><strong>${index.needs_repair_count || 0}</strong> repair</span>
    <span><strong>${index.blocked_count || 0}</strong> technical</span>
  `;
  const recipes = filteredRecipes();
  if (!recipes.length) {
    els.recipeList.innerHTML = `<p class="friendly-empty">No recipes match this filter.</p>`;
    return;
  }
  els.recipeList.innerHTML = recipes
    .map((recipe) => {
      const active = recipe.recipe_id === state.selectedId ? "active" : "";
      const decision = recipeDecision(recipe);
      const local = decision.decision ? `local ${decision.decision}` : statusLabel(recipe);
      return `
        <button class="queue-recipe ${active}" type="button" data-recipe-id="${escapeHtml(recipe.recipe_id)}">
          <span>${escapeHtml(recipe.title)}</span>
          <em>${escapeHtml(local)}</em>
        </button>
      `;
    })
    .join("");
}

function renderCount() {
  const recipes = filteredRecipes();
  const current = currentRecipe();
  if (!current || !recipes.length) {
    els.reviewCount.textContent = "0 of 0";
    return;
  }
  const index = recipes.findIndex((recipe) => recipe.recipe_id === current.recipe_id);
  els.reviewCount.textContent = `${index + 1} of ${recipes.length}`;
}

function renderAll() {
  const recipe = currentRecipe();
  if (recipe) state.selectedId = recipe.recipe_id;
  els.dataStatus.textContent = "Loaded";
  els.dataStatus.className = "state-pill good";
  const status = reviewQueueStatus();
  renderQueue();
  if (shouldShowReviewStatusPage(status)) {
    els.reviewCount.textContent = "0 waiting";
    renderReviewStatusPage(status);
    renderReviewStatusDecisionPanel(status);
    return;
  }
  renderCount();
  renderProfile(recipe);
}

function renderDatabaseFilters() {
  if (!els.databaseFilters) return;
  const mealTypes = databaseMealTypes();
  const buttons = [
    `<button class="database-filter ${state.databaseFilter === "all" ? "active" : ""}" type="button" data-database-filter="all">All</button>`,
    ...mealTypes.map(
      (mealType) =>
        `<button class="database-filter ${state.databaseFilter === mealType ? "active" : ""}" type="button" data-database-filter="${escapeHtml(mealType)}">${escapeHtml(mealTypeLabel(mealType))}</button>`,
    ),
  ];
  els.databaseFilters.innerHTML = buttons.join("");
}

function renderSendBackPanel(recipe) {
  const reasonOptions = Object.entries(FAIL_REASONS)
    .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
    .join("");
  return `
    <section class="story-section send-back-panel">
      <div class="section-title-row">
        <h3>Send Back For Changes</h3>
        <span>Import required</span>
      </div>
      <p>This creates a Fail-style JSON packet. Codex must import it before the recipe leaves the approved database.</p>
      <div class="review-fields database-review-fields">
        <label for="database-fail-reason">Reason</label>
        <select id="database-fail-reason" data-send-back-reason>
          ${reasonOptions}
        </select>
        <label for="database-review-notes">Notes</label>
        <textarea id="database-review-notes" data-send-back-notes rows="2" placeholder="What should be changed?"></textarea>
      </div>
      <button class="copy-decision-button" type="button" data-copy-send-back="${escapeHtml(recipe.recipe_id)}">Copy Send-Back JSON</button>
    </section>
  `;
}

function buildSendBackPayload(recipe, reasonCode, notes) {
  return {
    schema_version: "v3.recipe_review_decision.1",
    recipe_id: recipe.recipe_id,
    run_slug: recipe.run_slug,
    title: recipe.title,
    decision: "fail",
    reason_code: reasonCode || "other_notes",
    reason_label: FAIL_REASONS[reasonCode] || FAIL_REASONS.other_notes,
    notes: notes || "",
    reviewed_by: "Luke",
    reviewed_at: new Date().toISOString(),
    source: "recipe_database_send_back_export",
    import_required: true,
  };
}

async function copySendBackDecision(button) {
  const recipe = currentDatabaseRecipe();
  if (!recipe || button.dataset.copySendBack !== recipe.recipe_id) return;
  const reason = els.databaseDetail.querySelector("[data-send-back-reason]")?.value || "other_notes";
  const notes = els.databaseDetail.querySelector("[data-send-back-notes]")?.value || "";
  const jsonText = JSON.stringify(buildSendBackPayload(recipe, reason, notes), null, 2);
  try {
    await navigator.clipboard.writeText(jsonText);
    button.textContent = "Copied for Codex";
  } catch {
    showCopyFallback(button.closest(".send-back-panel"), jsonText);
    button.textContent = "Select JSON below";
  }
}

function renderDatabase() {
  if (!els.databaseList || !els.databaseDetail) return;
  if (!state.index) {
    els.databaseDataStatus.textContent = "Missing";
    els.databaseDataStatus.className = "state-pill blocked";
    els.databaseList.innerHTML = `<p class="friendly-empty">Could not load recipe data.</p>`;
    return;
  }
  els.databaseDataStatus.textContent = "Loaded";
  els.databaseDataStatus.className = "state-pill good";
  renderDatabaseFilters();
  const approved = approvedRecipes();
  if (!approved.length) {
    els.databaseList.innerHTML = `
      <div class="empty-panel">
        <strong>No approved recipes yet</strong>
        <p>Pass a recipe in Recipe Review, copy the review JSON, then Codex imports it and rebuilds this shelf.</p>
      </div>
    `;
    els.databaseDetail.innerHTML = `
      <div class="empty-panel wide">
        <strong>Approved shelf is protected</strong>
        <p>Browser-local Pass state does not count as approval. This area only reads saved imported review files.</p>
      </div>
    `;
    return;
  }
  const recipes = filteredDatabaseRecipes();
  const recipe = currentDatabaseRecipe();
  if (recipe) state.selectedDatabaseId = recipe.recipe_id;
  if (!recipes.length) {
    els.databaseList.innerHTML = `<p class="friendly-empty">No approved recipes match this filter.</p>`;
    els.databaseDetail.innerHTML = `<div class="empty-panel wide"><strong>No match</strong><p>Choose another meal type.</p></div>`;
    return;
  }
  els.databaseList.innerHTML = recipes.map((item) => approvedCard(item, item.recipe_id === recipe?.recipe_id, "data-database-recipe-id")).join("");
  els.databaseDetail.innerHTML = recipe
    ? [
        renderHero(recipe),
        renderSuitability(recipe),
        renderNutrition(recipe),
        renderRecipePreview(recipe),
        renderShopping(recipe),
        renderProofSummary(recipe),
        renderSendBackPanel(recipe),
      ].join("")
    : `<div class="empty-panel wide"><strong>No recipe selected</strong><p>Choose an approved recipe from the menu.</p></div>`;
}

function groupedShoppingRows(recipe) {
  const rows = Array.isArray(recipe.shopping_rows) ? recipe.shopping_rows : [];
  const categories = new Map();
  rows.forEach((row) => {
    const category = row.ingredient_category || "Food";
    const treatment = shoppingTreatmentLabel(row.shopping_treatment);
    if (!categories.has(category)) categories.set(category, new Map());
    if (!categories.get(category).has(treatment)) categories.get(category).set(treatment, []);
    categories.get(category).get(treatment).push(row);
  });
  return categories;
}

function renderShoppingGroups(recipe) {
  const categories = groupedShoppingRows(recipe);
  if (!categories.size) return `<p class="friendly-empty">No recipe-level shopping rows are saved for this recipe.</p>`;
  return Array.from(categories.entries())
    .map(
      ([category, treatments]) => `
        <section class="shopping-category-group">
          <h4>${escapeHtml(category)}</h4>
          ${Array.from(treatments.entries())
            .map(
              ([treatment, rows]) => `
                <div class="shopping-treatment-group">
                  <strong>${escapeHtml(treatment)}</strong>
                  <div class="shopping-list">
                    ${rows
                      .map(
                        (row) => `
                          <div class="shopping-line">
                            <div>
                              <strong>${escapeHtml(row.ingredient_name)}</strong>
                              <span>${escapeHtml(row.purchase_display || row.pack_label || "pack")} - ${escapeHtml(row.needed_kitchen_display || `${number(row.needed_quantity)} ${row.needed_unit || ""}`)}</span>
                            </div>
                            <em>${money(row.estimated_used_cost_gbp)}</em>
                          </div>
                        `,
                      )
                      .join("")}
                  </div>
                </div>
              `,
            )
            .join("")}
        </section>
      `,
    )
    .join("");
}

function renderShoppingMenu() {
  if (!els.shoppingRecipeList || !els.shoppingDetail) return;
  if (!state.index) {
    els.shoppingDataStatus.textContent = "Missing";
    els.shoppingDataStatus.className = "state-pill blocked";
    els.shoppingRecipeList.innerHTML = `<p class="friendly-empty">Could not load recipe data.</p>`;
    return;
  }
  els.shoppingDataStatus.textContent = "Loaded";
  els.shoppingDataStatus.className = "state-pill good";
  const recipes = approvedRecipes();
  if (!recipes.length) {
    els.shoppingRecipeList.innerHTML = `
      <div class="empty-panel">
        <strong>No approved recipes yet</strong>
        <p>Recipe shopping appears here after a recipe is confirmed by imported review JSON.</p>
      </div>
    `;
    els.shoppingDetail.innerHTML = `
      <div class="empty-panel wide">
        <strong>Recipe-level only</strong>
        <p>This screen cannot create a weekly shop. The weekly planner will do that later.</p>
      </div>
    `;
    return;
  }
  const recipe = currentShoppingRecipe();
  if (recipe) state.selectedShoppingId = recipe.recipe_id;
  els.shoppingRecipeList.innerHTML = recipes.map((item) => approvedCard(item, item.recipe_id === recipe?.recipe_id, "data-shopping-recipe-id")).join("");
  els.shoppingDetail.innerHTML = recipe
    ? `
      <section class="shopping-summary-card">
        <div class="section-title-row">
          <h3>${escapeHtml(recipe.title)}</h3>
          <span>${escapeHtml(recipeCostHeadline(recipe))}</span>
        </div>
        <p>Recipe-level shopping only. Pack labels, quantities, category, pantry, and cost come from saved recipe data.</p>
      </section>
      ${renderShoppingGroups(recipe)}
    `
    : `<div class="empty-panel wide"><strong>No recipe selected</strong><p>Choose an approved recipe to view its shopping rows.</p></div>`;
}

function currentProfile() {
  const people = state.profileIndex?.people || [];
  return people.find((profile) => profile.person === state.selectedPerson) || people[0] || null;
}

function profileStatus(textValue, tone = "good") {
  return `<span class="state-pill ${tone}">${escapeHtml(textValue)}</span>`;
}

function metricTile(label, value, suffix = "") {
  const display = value === "" || value === null || value === undefined ? "Not set" : `${escapeHtml(value)}${suffix}`;
  return `
    <div class="profile-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${display}</strong>
    </div>
  `;
}

function mealSlotLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function renderProfileTabs() {
  const people = state.profileIndex?.people || [];
  els.profileTabs.innerHTML = people
    .map(
      (profile) => `
        <button class="profile-tab ${profile.person === state.selectedPerson ? "active" : ""}" type="button" data-profile-person="${escapeHtml(profile.person)}">
          ${escapeHtml(profile.person)}
        </button>
      `,
    )
    .join("");
}

function renderDailyGoals(profile) {
  const goals = profile.daily_goals || {};
  return `
    <section class="profile-section">
      <div class="section-title-row">
        <h3>Daily Goals</h3>
        <button class="mini-button" type="button" data-open-profile-edit="daily">Edit</button>
      </div>
      <div class="profile-grid">
        ${metricTile("Calories", goals.kcal_min && goals.kcal_max ? `${goals.kcal_min}-${goals.kcal_max}` : "")}
        ${metricTile("Protein", goals.protein_max_g ? `${goals.protein_min_g}-${goals.protein_max_g}` : goals.protein_min_g, goals.protein_min_g ? "g" : "")}
        ${metricTile("Fruit/Veg", goals.fruitveg_min_tenths, goals.fruitveg_min_tenths ? " tenths" : "")}
        ${metricTile("Fish", goals.fish_meal_min_week, goals.fish_meal_min_week ? " per week" : "")}
        ${metricTile("Oily Fish", goals.oily_fish_meal_min_week, goals.oily_fish_meal_min_week ? " per week" : "")}
        ${metricTile("Child Breakfast Min", goals.home_breakfast_kcal_min, goals.home_breakfast_kcal_min ? " kcal" : "")}
      </div>
    </section>
  `;
}

function renderMealTargets(profile) {
  const targets = profile.meal_targets || [];
  return `
    <section class="profile-section">
      <h3>Meal Targets</h3>
      <div class="target-list">
        ${targets
          .map(
            (target) => `
              <article class="target-card">
                <div>
                  <strong>${escapeHtml(mealSlotLabel(target.meal_slot))}</strong>
                  <span>${escapeHtml(target.slot_context || target.slot_family)}</span>
                </div>
                <div class="target-values">
                  <em>${escapeHtml(target.kcal_target_min)}-${escapeHtml(target.kcal_target_max)} kcal</em>
                  <em>${escapeHtml(target.protein_target_min_g)}-${escapeHtml(target.protein_target_max_g)}g protein</em>
                  <em>${escapeHtml(target.fullness_target_min)}-${escapeHtml(target.fullness_target_max)} fullness</em>
                </div>
                <button class="mini-button" type="button" data-open-profile-edit="meal" data-target-id="${escapeHtml(target.target_id)}">Edit</button>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderFoodRules(profile) {
  const rules = profile.food_rules || [];
  return `
    <section class="profile-section">
      <h3>Food Rules</h3>
      <div class="rule-list">
        ${rules
          .map(
            (rule) => `
              <article class="rule-card ${rule.severity === "hard" ? "hard" : "soft-rule"}">
                <div>
                  <strong>${escapeHtml(rule.target_label || rule.target_code)}</strong>
                  <span>${escapeHtml(rule.person)} - ${escapeHtml(rule.rule_type)} - ${escapeHtml(rule.scope)}</span>
                </div>
                <p>${escapeHtml(rule.planner_impact || rule.notes)}</p>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderFinishers(profile) {
  const finishers = profile.finishers || [];
  if (!finishers.length) {
    return `
      <section class="profile-section">
        <h3>Finishers</h3>
        <p class="friendly-empty">No adult finisher controls are saved for this profile.</p>
      </section>
    `;
  }
  return `
    <section class="profile-section">
      <h3>Finishers</h3>
      <div class="finisher-list">
        ${finishers
          .map(
            (finisher) => `
              <div class="finisher-pill">
                <strong>${escapeHtml(finisher.name)}</strong>
                <span>${escapeHtml(finisher.min_units)}-${escapeHtml(finisher.max_units)} ${escapeHtml(finisher.portion_unit)}</span>
              </div>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function inputField(label, name, value, type = "number") {
  return `
    <label class="edit-field">
      <span>${escapeHtml(label)}</span>
      <input name="${escapeHtml(name)}" data-authority-field="${escapeHtml(name)}" type="${escapeHtml(type)}" value="${escapeHtml(value ?? "")}" />
    </label>
  `;
}

function renderProfileEditor(profile) {
  const edit = state.activeProfileEdit;
  if (!edit) return "";
  if (edit.type === "daily") {
    const goals = profile.daily_goals || {};
    return `
      <section class="profile-section edit-panel">
        <h3>Edit Daily Goals Draft</h3>
        <form data-profile-edit-form data-target-table="profile_goal_authority" data-target-id="${escapeHtml(goals.goal_id)}">
          <div class="edit-grid">
            ${inputField("Kcal min", "kcal_min", goals.kcal_min)}
            ${inputField("Kcal max", "kcal_max", goals.kcal_max)}
            ${inputField("Protein min g", "protein_min_g", goals.protein_min_g)}
            ${inputField("Protein max g", "protein_max_g", goals.protein_max_g)}
            ${inputField("Fruit/Veg tenths", "fruitveg_min_tenths", goals.fruitveg_min_tenths)}
            ${inputField("Fish meals per week", "fish_meal_min_week", goals.fish_meal_min_week)}
            ${inputField("Oily fish per week", "oily_fish_meal_min_week", goals.oily_fish_meal_min_week)}
          </div>
          <label class="edit-field wide">
            <span>Reason</span>
            <textarea name="reason" placeholder="Optional reason for the change"></textarea>
          </label>
          <div class="edit-actions">
            <button class="mini-button dark" type="submit">Save Draft</button>
            <button class="mini-button" type="button" data-close-profile-edit>Cancel</button>
          </div>
        </form>
      </section>
    `;
  }
  const target = (profile.meal_targets || []).find((row) => row.target_id === edit.targetId);
  if (!target) return "";
  return `
    <section class="profile-section edit-panel">
      <h3>Edit ${escapeHtml(mealSlotLabel(target.meal_slot))} Draft</h3>
      <form data-profile-edit-form data-target-table="meal_slot_target_authority" data-target-id="${escapeHtml(target.target_id)}">
        <div class="edit-grid">
          ${inputField("Kcal target min", "kcal_target_min", target.kcal_target_min)}
          ${inputField("Kcal target max", "kcal_target_max", target.kcal_target_max)}
          ${inputField("Kcal hard min", "kcal_hard_min", target.kcal_hard_min)}
          ${inputField("Kcal hard max", "kcal_hard_max", target.kcal_hard_max)}
          ${inputField("Protein target min g", "protein_target_min_g", target.protein_target_min_g)}
          ${inputField("Protein target max g", "protein_target_max_g", target.protein_target_max_g)}
          ${inputField("Fullness target min", "fullness_target_min", target.fullness_target_min)}
          ${inputField("Fullness target max", "fullness_target_max", target.fullness_target_max)}
          ${inputField("Cost max GBP", "cost_max_gbp", target.cost_max_gbp)}
          ${inputField("Active time max minutes", "active_time_max_minutes", target.active_time_max_minutes)}
        </div>
        <label class="edit-field wide">
          <span>Reason</span>
          <textarea name="reason" placeholder="Optional reason for the change"></textarea>
        </label>
        <div class="edit-actions">
          <button class="mini-button dark" type="submit">Save Draft</button>
          <button class="mini-button" type="button" data-close-profile-edit>Cancel</button>
        </div>
      </form>
    </section>
  `;
}

function renderPlannerBoundary() {
  return `
    <section class="profile-section boundary-note">
      <h3>Planner Boundary</h3>
      <p>This screen creates draft changes only. A future import job must validate the draft before the planner can use it.</p>
      <div class="proof-bites">
        ${profileStatus("No planner rows", "review")}
        ${profileStatus("No recipes", "review")}
        ${profileStatus("No Google output", "review")}
      </div>
    </section>
  `;
}

function renderProfiles() {
  const profile = currentProfile();
  if (!state.profileIndex || !profile) {
    els.profileDataStatus.textContent = "Missing";
    els.profileDataStatus.className = "state-pill blocked";
    els.profileContent.innerHTML = `<div class="loading-card">Could not load data/profile-index.json.</div>`;
    return;
  }
  state.selectedPerson = profile.person;
  els.profileDataStatus.textContent = "Loaded";
  els.profileDataStatus.className = "state-pill good";
  renderProfileTabs();
  els.profileContent.innerHTML = [
    renderProfileEditor(profile),
    renderDailyGoals(profile),
    renderMealTargets(profile),
    renderFoodRules(profile),
    renderFinishers(profile),
    renderPlannerBoundary(),
  ].join("");
  renderSkuResults();
  renderDraftQueue();
}

function sourceValueForDraft(profile, table, targetId, field) {
  if (table === "profile_goal_authority") return profile.daily_goals?.[field] ?? "";
  if (table === "meal_slot_target_authority") {
    const row = (profile.meal_targets || []).find((target) => target.target_id === targetId);
    return row?.[field] ?? "";
  }
  return "";
}

function createDraft(change) {
  return {
    draft_id: `DRAFT-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    created_at: new Date().toISOString(),
    source: "v3_phone_profiles_app",
    status: "draft_local_only",
    import_required: true,
    ...change,
  };
}

function addDraft(change) {
  state.profileDrafts.unshift(createDraft(change));
  saveProfileDrafts();
  renderDraftQueue();
}

function handleProfileEditSubmit(form) {
  const profile = currentProfile();
  if (!profile) return;
  const formData = new FormData(form);
  const table = form.dataset.targetTable;
  const targetId = form.dataset.targetId;
  const reason = String(formData.get("reason") || "Drafted in Profiles app").trim();
  const fields = [...form.querySelectorAll("[data-authority-field]")].map((input) => input.name);
  let changed = 0;
  fields.forEach((field) => {
    const oldValue = sourceValueForDraft(profile, table, targetId, field);
    const newValue = String(formData.get(field) ?? "").trim();
    if (String(oldValue ?? "") === newValue) return;
    state.profileDrafts.unshift(
      createDraft({
        person: profile.person,
        target_table: table,
        target_id: targetId,
        field,
        old_value: oldValue,
        new_value: newValue,
        reason,
        planner_effect: "requires_authority_import_before_planner_use",
      }),
    );
    changed += 1;
  });
  if (changed) saveProfileDrafts();
  state.activeProfileEdit = null;
  renderProfiles();
}

function addFoodRuleDraft(button) {
  const profile = currentProfile();
  if (!profile) return;
  const sku = (state.profileIndex?.sku_search_index || []).find((row) => row.sku_code === button.dataset.skuCode);
  if (!sku) return;
  const targetType = button.dataset.targetType;
  const ruleType = button.dataset.ruleType;
  const targetCode = targetType === "sku" ? sku.sku_code : sku.ingredient_code;
  const targetLabel = targetType === "sku" ? sku.product_name : `Ingredient family ${sku.ingredient_code}`;
  const newRule = {
    person: profile.person,
    rule_type: ruleType,
    severity: ruleType === "cannot_eat" ? "hard" : "soft",
    target_type: targetType,
    target_code: targetCode,
    target_label: targetLabel,
    ingredient_code: sku.ingredient_code,
    sku_code: targetType === "sku" ? sku.sku_code : "",
    scope: "all_slots",
    action: ruleType === "cannot_eat" ? "block_for_person" : "avoid_default",
    planner_impact:
      ruleType === "cannot_eat"
        ? "Planner must block this product for the selected person."
        : "Planner should avoid this product unless no better option exists.",
  };
  addDraft({
    person: profile.person,
    target_table: "profile_food_rule_authority",
    target_id: "new_rule",
    field: "new_food_rule",
    old_value: "",
    new_value: JSON.stringify(newRule),
    reason: `Drafted from SKU search for ${sku.product_name}`,
    planner_effect: "requires_authority_import_before_planner_use",
  });
}

function renderSkuResults() {
  if (!els.profileSkuResults) return;
  const query = state.profileSkuQuery.trim().toLowerCase();
  const skuRows = state.profileIndex?.sku_search_index || [];
  if (query.length < 2) {
    els.profileSkuResults.innerHTML = `<p class="friendly-empty">${escapeHtml(skuRows.length)} saved SKUs available. Type at least 2 letters.</p>`;
    return;
  }
  const matches = skuRows.filter((row) => row.search_text.includes(query)).slice(0, 8);
  if (!matches.length) {
    els.profileSkuResults.innerHTML = `<p class="friendly-empty">No saved SKU matched that search.</p>`;
    return;
  }
  els.profileSkuResults.innerHTML = matches
    .map(
      (row) => `
        <article class="sku-result">
          <div>
            <strong>${escapeHtml(row.product_name)}</strong>
            <span>${escapeHtml(row.shop)} - ${escapeHtml(row.category)} - ${escapeHtml(row.pack_display)}</span>
          </div>
          <div class="sku-actions">
            <button class="mini-button" type="button" data-add-food-rule data-rule-type="cannot_eat" data-target-type="sku" data-sku-code="${escapeHtml(row.sku_code)}">Cannot eat</button>
            <button class="mini-button" type="button" data-add-food-rule data-rule-type="dislike" data-target-type="sku" data-sku-code="${escapeHtml(row.sku_code)}">Dislike</button>
            <button class="mini-button dark" type="button" data-add-food-rule data-rule-type="avoid" data-target-type="ingredient_code" data-sku-code="${escapeHtml(row.sku_code)}">Avoid family</button>
          </div>
        </article>
      `,
    )
    .join("");
}

function draftPlainSummary(draft) {
  if (draft.field === "new_food_rule") {
    try {
      const rule = JSON.parse(draft.new_value || "{}");
      return `${rule.rule_type || "rule"} for ${rule.target_label || rule.target_code || "selected product"} - ${rule.planner_impact || "requires planner validation"}`;
    } catch {
      return "New food rule draft requires validation before planner use.";
    }
  }
  const oldValue = String(draft.old_value ?? "") || "blank";
  const newValue = String(draft.new_value ?? "") || "blank";
  return `${draft.field}: ${oldValue} -> ${newValue}`;
}

function renderDraftQueue() {
  if (!els.profileDraftQueue) return;
  if (!state.profileDrafts.length) {
    els.profileDraftQueue.innerHTML = `<p class="friendly-empty">No draft profile changes saved on this device.</p>`;
    return;
  }
  els.profileDraftQueue.innerHTML = `
    <div class="draft-actions">
      <button class="mini-button" type="button" data-copy-profile-drafts>Copy Draft JSON</button>
      <button class="mini-button danger" type="button" data-clear-profile-drafts>Clear</button>
    </div>
    <div class="draft-list">
      ${state.profileDrafts
        .map(
          (draft) => `
            <article class="draft-card">
              <strong>${escapeHtml(draft.person)} - ${escapeHtml(draft.field)}</strong>
              <span>${escapeHtml(draft.target_table)} / ${escapeHtml(draft.target_id)}</span>
              <p>${escapeHtml(draftPlainSummary(draft))}</p>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function moveSelection(direction) {
  const recipes = filteredRecipes();
  if (!recipes.length) return;
  const current = currentRecipe();
  const index = Math.max(0, recipes.findIndex((recipe) => recipe.recipe_id === current?.recipe_id));
  const next = recipes[(index + direction + recipes.length) % recipes.length];
  state.selectedId = next.recipe_id;
  renderAll();
}

function setDecision(value, autoCopy = false) {
  const recipe = currentRecipe();
  if (!recipe) return;
  const reasonCode = value === "fail" ? (els.failReason?.value || "other_notes") : "accepted";
  state.decisions[recipe.recipe_id] = {
    decision: value,
    reason_code: reasonCode,
    reason_label: value === "fail" ? (FAIL_REASONS[reasonCode] || FAIL_REASONS.other_notes) : "Accepted",
    notes: els.reviewNotes?.value || "",
    updated_at: new Date().toISOString(),
  };
  saveDecisions();
  renderAll();
  if (autoCopy) copyReviewDecision();
}

function buildReviewDecisionPayload(recipe) {
  const decision = recipe ? recipeDecision(recipe) : {};
  const decisionValue = decision.decision || "";
  if (!recipe || !decisionValue) return null;
  const reasonCode = decisionValue === "fail" ? (els.failReason?.value || decision.reason_code || "other_notes") : "accepted";
  return {
    schema_version: "v3.recipe_review_decision.1",
    recipe_id: recipe.recipe_id,
    run_slug: recipe.run_slug,
    title: recipe.title,
    decision: decisionValue,
    reason_code: reasonCode,
    reason_label: decisionValue === "fail" ? (FAIL_REASONS[reasonCode] || FAIL_REASONS.other_notes) : "Accepted",
    notes: els.reviewNotes?.value || decision.notes || "",
    reviewed_by: "Luke",
    reviewed_at: new Date().toISOString(),
    source: "recipe_explorer_app_local_export",
    import_required: true,
  };
}

async function copyReviewDecision() {
  const recipe = currentRecipe();
  const payload = buildReviewDecisionPayload(recipe);
  if (!payload) return;
  const jsonText = JSON.stringify(payload, null, 2);
  try {
    await navigator.clipboard.writeText(jsonText);
    const label = payload.decision === "pass" ? "Pass" : "Fail";
    els.copyReviewDecision.textContent = `${label} JSON copied`;
    els.decisionCopy.textContent = `${label} selected and JSON copied. Paste it into Codex to import the review.`;
  } catch {
    showCopyFallback(document.querySelector(".decision-panel"), jsonText);
    els.copyReviewDecision.textContent = "Select JSON below";
    const label = payload.decision === "pass" ? "Pass" : "Fail";
    els.decisionCopy.textContent = `${label} selected. Copy the JSON box below and paste it into Codex to import the review.`;
  }
}

function attachEvents() {
  els.nextButton.addEventListener("click", () => moveSelection(1));
  els.previousButton.addEventListener("click", () => moveSelection(-1));
  els.passButton.addEventListener("click", () => setDecision("pass", true));
  els.failButton.addEventListener("click", () => setDecision("fail", true));
  els.copyReviewDecision.addEventListener("click", copyReviewDecision);

  els.recipeList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-recipe-id]");
    if (!button) return;
    state.selectedId = button.dataset.recipeId;
    renderAll();
  });

  els.profile.addEventListener("click", (event) => {
    const button = event.target.closest("[data-complete-filter]");
    if (!button) return;
    state.filter = button.dataset.completeFilter;
    els.filters.forEach((item) => item.classList.toggle("active", item.dataset.filter === state.filter));
    const first = filteredRecipes()[0];
    state.selectedId = first?.recipe_id || "";
    renderAll();
  });

  els.filters.forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      els.filters.forEach((item) => item.classList.toggle("active", item === button));
      const first = filteredRecipes()[0];
      state.selectedId = first?.recipe_id || "";
      renderAll();
    });
  });

  els.databaseFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-database-filter]");
    if (!button) return;
    state.databaseFilter = button.dataset.databaseFilter;
    const first = filteredDatabaseRecipes()[0];
    state.selectedDatabaseId = first?.recipe_id || "";
    renderDatabase();
  });

  els.databaseList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-database-recipe-id]");
    if (!button) return;
    state.selectedDatabaseId = button.dataset.databaseRecipeId;
    renderDatabase();
  });

  els.databaseDetail.addEventListener("click", (event) => {
    const button = event.target.closest("[data-copy-send-back]");
    if (!button) return;
    copySendBackDecision(button);
  });

  els.shoppingRecipeList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-shopping-recipe-id]");
    if (!button) return;
    state.selectedShoppingId = button.dataset.shoppingRecipeId;
    renderShoppingMenu();
  });

  els.profileTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-profile-person]");
    if (!button) return;
    state.selectedPerson = button.dataset.profilePerson;
    state.activeProfileEdit = null;
    renderProfiles();
  });

  els.profileContent.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-open-profile-edit]");
    if (openButton) {
      state.activeProfileEdit = {
        type: openButton.dataset.openProfileEdit,
        targetId: openButton.dataset.targetId || "",
      };
      renderProfiles();
      return;
    }
    const closeButton = event.target.closest("[data-close-profile-edit]");
    if (closeButton) {
      state.activeProfileEdit = null;
      renderProfiles();
    }
  });

  els.profileContent.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-profile-edit-form]");
    if (!form) return;
    event.preventDefault();
    handleProfileEditSubmit(form);
  });

  els.profileSkuSearch.addEventListener("input", (event) => {
    state.profileSkuQuery = event.target.value;
    renderSkuResults();
  });

  els.profileSkuResults.addEventListener("click", (event) => {
    const button = event.target.closest("[data-add-food-rule]");
    if (!button) return;
    addFoodRuleDraft(button);
  });

  els.profileDraftQueue.addEventListener("click", async (event) => {
    const copyButton = event.target.closest("[data-copy-profile-drafts]");
    if (copyButton) {
      const payload = JSON.stringify(
        {
          schema_version: "v3.profile_draft_changes.1",
          copied_at: new Date().toISOString(),
          import_required: true,
          drafts: state.profileDrafts,
        },
        null,
        2,
      );
      try {
        await navigator.clipboard.writeText(payload);
        copyButton.textContent = "Copied";
      } catch {
        copyButton.textContent = "Copy failed";
      }
      return;
    }
    const clearButton = event.target.closest("[data-clear-profile-drafts]");
    if (clearButton) {
      state.profileDrafts = [];
      saveProfileDrafts();
      renderDraftQueue();
    }
  });

  window.addEventListener("hashchange", () => showRoute(routeFromHash()));
  document.querySelector(".github-link").setAttribute("href", REPO_URL);
}

async function init() {
  attachEvents();
  showRoute(routeFromHash());
  try {
    const [recipeResponse, profileResponse] = await Promise.all([
      fetch("./data/recipe-index.json", { cache: "no-store" }),
      fetch("./data/profile-index.json", { cache: "no-store" }),
    ]);
    if (!recipeResponse.ok) throw new Error(`recipe-index HTTP ${recipeResponse.status}`);
    if (!profileResponse.ok) throw new Error(`profile-index HTTP ${profileResponse.status}`);
    state.index = await recipeResponse.json();
    state.profileIndex = await profileResponse.json();
    const firstReview = state.index.recipes.find((recipe) => recipe.status === "needs_review");
    const firstApproved = approvedRecipes()[0];
    state.selectedId = firstReview?.recipe_id || state.index.recipes[0]?.recipe_id || "";
    state.selectedDatabaseId = firstApproved?.recipe_id || "";
    state.selectedShoppingId = firstApproved?.recipe_id || "";
    if (state.route === "recipes") renderAll();
    if (state.route === "database") renderDatabase();
    if (state.route === "shopping") renderShoppingMenu();
    if (state.route === "profiles") renderProfiles();
  } catch (error) {
    els.dataStatus.textContent = "Missing";
    els.dataStatus.className = "state-pill blocked";
    els.profile.innerHTML = `<div class="loading-card">Could not load data/recipe-index.json.</div>`;
    if (els.databaseDataStatus) {
      els.databaseDataStatus.textContent = "Missing";
      els.databaseDataStatus.className = "state-pill blocked";
    }
    if (els.databaseList) {
      els.databaseList.innerHTML = `<p class="friendly-empty">Could not load recipe app data.</p>`;
    }
    if (els.shoppingDataStatus) {
      els.shoppingDataStatus.textContent = "Missing";
      els.shoppingDataStatus.className = "state-pill blocked";
    }
    if (els.shoppingRecipeList) {
      els.shoppingRecipeList.innerHTML = `<p class="friendly-empty">Could not load recipe app data.</p>`;
    }
    if (els.profileDataStatus) {
      els.profileDataStatus.textContent = "Missing";
      els.profileDataStatus.className = "state-pill blocked";
    }
    if (els.profileContent) {
      els.profileContent.innerHTML = `<div class="loading-card">Could not load profile app data.</div>`;
    }
    console.error(error);
  }
}

init();
