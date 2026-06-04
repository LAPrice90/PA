# V3 Profile Authority Contract

Status date: 2026-06-04

## Purpose

Profiles are the planner settings source.

Plain English: this is the control panel for people, goals, food rules, and SKU-linked dislikes. The phone app may draft changes, but the planner reads only validated authority files.

## Authority Files

- `profile_goal_authority.csv` stores daily calories, protein, fruit/veg, fish, and child meal minimum targets.
- `meal_slot_target_authority.csv` stores per-person meal-slot ranges, fullness/load, cost, and active-time limits.
- `profile_food_family_authority.csv` stores enforceable food families such as normal pasta, kiwi, brown rice, and strong heat.
- `profile_food_rule_authority.csv` stores person or household rules against a SKU, ingredient, or food family.
- `profile_change_log.csv` records imported profile changes after validation.

## App Boundary

The app reads `data/profile-index.json`.

The app may save browser-local draft changes. Those drafts are not planner authority.

The app must not create:

- recipes;
- recipe approvals;
- planner rows;
- week packages;
- shopping outputs;
- calendar renders;
- Google events;
- live receipts;
- automation output.

## Planner Rule

The future planner may read profile authority only after validation passes.

Drafts become planner truth only after an import job checks:

- numeric ranges are valid;
- every active person has daily and meal-slot targets;
- every food rule resolves to a known SKU, ingredient code, or approved food family;
- Sarah pasta is pasta-only and does not catch noodles, bread, flour, soy sauce, or pastry;
- hard person rules are machine-readable, not loose notes.

## First Safe Edit Mode

First version uses Draft Queue mode.

Plain English: Luke can make a proposed change on the phone, see what it would do, and copy or export the draft. Codex then imports it through validation before the planner can use it.
