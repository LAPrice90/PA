const REPO_URL = "https://github.com/LAPrice90/PA";
const DECISION_KEY = "v3_recipe_review_decisions";

const state = {
  index: null,
  selectedId: "",
  filter: "all",
  decisions: loadDecisions(),
};

const els = {
  dataStatus: document.querySelector("#data-status"),
  profile: document.querySelector("#recipe-profile"),
  recipeList: document.querySelector("#recipe-list"),
  queueSummary: document.querySelector("#queue-summary"),
  reviewCount: document.querySelector("#review-count"),
  decisionCopy: document.querySelector("#decision-copy"),
  passButton: document.querySelector("#pass-recipe"),
  failButton: document.querySelector("#fail-recipe"),
  nextButton: document.querySelector("#next-recipe"),
  previousButton: document.querySelector("#previous-recipe"),
  filters: [...document.querySelectorAll(".filter-pill")],
};

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

function sectionLines(markdown, heading) {
  const lines = String(markdown || "").split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start === -1) return [];
  const output = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (line.startsWith("## ")) break;
    if (!line || line.startsWith("### ")) continue;
    output.push(line.replace(/^- /, ""));
  }
  return output.slice(0, 8);
}

function statusLabel(recipe) {
  if (recipe.status === "approved") return "Confirmed";
  if (recipe.status === "needs_review") return "Needs review";
  return "Blocked";
}

function statusTone(recipe) {
  if (recipe.status === "approved") return "good";
  if (recipe.status === "needs_review") return "review";
  return "blocked";
}

function recipeDecision(recipe) {
  return state.decisions[recipe.recipe_id] || "";
}

function filteredRecipes() {
  if (!state.index) return [];
  return state.index.recipes.filter((recipe) => state.filter === "all" || recipe.status === state.filter);
}

function currentRecipe() {
  if (!state.index) return null;
  return state.index.recipes.find((recipe) => recipe.recipe_id === state.selectedId) || filteredRecipes()[0] || state.index.recipes[0] || null;
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

function suitabilityItems(recipe) {
  const flags = recipe.binary_flags || {};
  const items = [];
  items.push({ label: "Meal", value: recipe.meal_type || "Unclassified" });
  items.push({ label: "Time", value: recipe.timing?.total_minutes ? `${recipe.timing.total_minutes} minutes` : "Not proven" });
  items.push({ label: "Cooking", value: flags.serve_immediately ? "Serve fresh" : flags.stores_for_later ? "Stores for later" : "Check notes" });
  items.push({ label: "Shelf", value: recipe.status === "needs_review" ? "Waiting for Luke" : statusLabel(recipe) });
  items.push({ label: "Planner", value: recipe.algorithmic_planning_allowed ? "Allowed" : "Not allowed yet" });
  return items;
}

function renderHero(recipe) {
  const image = heroImage(recipe);
  const decision = recipeDecision(recipe);
  return `
    <section class="hero-card ${statusTone(recipe)}">
      <div class="hero-image" ${image ? `style="background-image: url('${image}')"` : ""}>
        ${image ? "" : `<div class="fallback-plate"><span></span><span></span></div>`}
        <div class="hero-shine"></div>
      </div>
      <div class="hero-copy">
        <div class="hero-row">
          <span class="state-pill ${statusTone(recipe)}">${escapeHtml(statusLabel(recipe))}</span>
          ${decision ? `<span class="state-pill chosen">${escapeHtml(decision === "pass" ? "Locally passed" : "Locally failed")}</span>` : ""}
        </div>
        <h2>${escapeHtml(recipe.title)}</h2>
        <p>${escapeHtml(firstParagraph(recipe.recipe_card_markdown, "A recipe profile ready for review."))}</p>
        <div class="tag-row">
          ${recipeTags(recipe).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
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
  const ingredients = sectionLines(recipe.recipe_card_markdown, "Ingredients");
  const method = sectionLines(recipe.recipe_card_markdown, "Method");
  return `
    <section class="story-section recipe-story">
      <h3>Recipe Card</h3>
      <div class="recipe-preview">
        <div>
          <h4>What goes in</h4>
          <ul>
            ${ingredients.length ? ingredients.slice(0, 6).map((line) => `<li>${escapeHtml(line)}</li>`).join("") : `<li>No ingredient preview saved.</li>`}
          </ul>
        </div>
        <div>
          <h4>How it cooks</h4>
          <ol>
            ${method.length ? method.slice(0, 4).map((line) => `<li>${escapeHtml(line)}</li>`).join("") : `<li>No method preview saved.</li>`}
          </ol>
        </div>
      </div>
    </section>
  `;
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
        <span>${money(recipe.shopping_total_used_cost_gbp)}</span>
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

function renderProofSummary(recipe) {
  const proof = recipe.technical_proof || {};
  const counts = proof.source_authorised_counts || {};
  const sourceReady = proof.verdict === "PASS";
  const visual = recipe.review_visual || {};
  const visualReady = visual.status === "approved_for_review_display" && visual.visual_truth_check?.status === "PASS";
  const decisionText = recipe.human_review?.confirmed ? "Luke confirmed" : "Needs Luke confirmation";
  return `
    <section class="story-section proof-story">
      <h3>Proof, Without The Noise</h3>
      <div class="proof-bites">
        <span class="${sourceReady ? "ok" : "wait"}">${sourceReady ? "Data proof passed" : "Data proof blocked"}</span>
        <span class="${visualReady ? "ok" : "wait"}">${visualReady ? "Image truth passed" : "No checked image"}</span>
        <span class="${recipe.algorithmic_planning_allowed ? "ok" : "wait"}">${escapeHtml(decisionText)}</span>
        <span>${escapeHtml(counts.nutrition || 0)} nutrition rows</span>
        <span>${escapeHtml(counts.cost || 0)} cost rows</span>
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
    renderProofSummary(recipe),
  ].join("");
  renderDecisionPanel(recipe);
}

function renderDecisionPanel(recipe) {
  const decision = recipe ? recipeDecision(recipe) : "";
  if (!recipe) {
    els.decisionCopy.textContent = "No recipe selected.";
    return;
  }
  if (decision === "pass") {
    els.decisionCopy.textContent = "Local UI decision: Pass. This has not created a recipe approval file.";
  } else if (decision === "fail") {
    els.decisionCopy.textContent = "Local UI decision: Fail. This has not changed the recipe data.";
  } else if (recipe.status === "needs_review") {
    els.decisionCopy.textContent = "This recipe needs Luke review. Pass or Fail only saves a local UI note.";
  } else {
    els.decisionCopy.textContent = "Review this profile. Pass or Fail only saves a local UI note.";
  }
  els.passButton.classList.toggle("selected", decision === "pass");
  els.failButton.classList.toggle("selected", decision === "fail");
}

function renderQueue() {
  const index = state.index;
  if (!index) return;
  els.queueSummary.innerHTML = `
    <span><strong>${index.recipe_count}</strong> total</span>
    <span><strong>${index.needs_review_count || 0}</strong> to review</span>
    <span><strong>${index.blocked_count}</strong> blocked</span>
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
      return `
        <button class="queue-recipe ${active}" type="button" data-recipe-id="${escapeHtml(recipe.recipe_id)}">
          <span>${escapeHtml(recipe.title)}</span>
          <em>${escapeHtml(decision ? decision : statusLabel(recipe))}</em>
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
  renderQueue();
  renderCount();
  renderProfile(recipe);
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

function setDecision(value) {
  const recipe = currentRecipe();
  if (!recipe) return;
  state.decisions[recipe.recipe_id] = value;
  saveDecisions();
  renderAll();
}

function attachEvents() {
  els.nextButton.addEventListener("click", () => moveSelection(1));
  els.previousButton.addEventListener("click", () => moveSelection(-1));
  els.passButton.addEventListener("click", () => setDecision("pass"));
  els.failButton.addEventListener("click", () => setDecision("fail"));

  els.recipeList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-recipe-id]");
    if (!button) return;
    state.selectedId = button.dataset.recipeId;
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

  document.querySelector(".github-link").setAttribute("href", REPO_URL);
}

async function init() {
  attachEvents();
  try {
    const response = await fetch("./data/recipe-index.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.index = await response.json();
    const firstReview = state.index.recipes.find((recipe) => recipe.status === "needs_review");
    state.selectedId = firstReview?.recipe_id || state.index.recipes[0]?.recipe_id || "";
    renderAll();
  } catch (error) {
    els.dataStatus.textContent = "Missing";
    els.dataStatus.className = "state-pill blocked";
    els.profile.innerHTML = `<div class="loading-card">Could not load data/recipe-index.json.</div>`;
    console.error(error);
  }
}

init();
