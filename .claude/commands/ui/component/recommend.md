# ui:component:recommend

TRIGGER when: the user asks to recommend, suggest, propose, or identify new UI components for the project's component library, or asks what's missing, what to build next, or how to expand the library.

You are analyzing the project's existing UI inventory and recommending new components that would complement what's already there. Base recommendations on real gaps, observed composition style, and the project's own design philosophy — not on a generic checklist.

## Arguments

$ARGUMENTS

If the user provided context ("I'm building a dashboard", "we need more form pieces"), narrow recommendations to that area.

---

## 1. Load the Project Profile

Read `.claude/cache/project-profile.json`. If missing, stale, or relevant fields are `null`, invoke `/repo:discover --quiet` and re-read.

Pull these fields:

- `packages[*]` — focus on packages where `isFrontend: true`, `framework` is `react` or `next`, and `componentsDir` is set. Ask the user which package if more than one qualifies.
- `componentsDir`, `primitivesDir`, `hooksDir`, `tokensDir` — the inventory you'll inspect.
- `conventions.principles` — declared rules that should weight your recommendations (e.g. "compose existing components before inventing primitives" → bias toward components that mostly reuse what's there).
- `conventions.vocabularyGlossary` — use the project's terms in user-facing output.

If no qualifying package exists, stop and tell the user the project has no UI library to recommend against.

---

## 2. Inventory what exists

Run these reads in parallel against the chosen package.

### 2a. Existing components

Glob the `componentsDir` (one level deep, or following whatever pattern sibling components use — folders vs files). Record the full list. **Never rely on a memorized list — the library evolves.**

### 2b. Primitives, hooks, and tokens

Glob `primitivesDir`, `hooksDir`, and `tokensDir` (when set). These represent the building blocks a new component could reuse without expanding the surface area of the library.

### 2c. Partially built work

Look for entries in the tokens/recipes directory that have no matching component, and components missing demos or tests — both signal in-progress work the user may already plan to finish.

### 2d. Project-declared exclusions

Read `CLAUDE.md`, `AGENTS.md`, and the existing `ui/component.md` skill body for any "skip-recommend" or "do not scaffold" list. Treat anything declared there as authoritative — never propose it.

---

## 3. Identify gaps

Compare what you found against this catalog of universal UI categories. The catalog is a **lens**, not a checklist — adapt it to the project's domain and design philosophy.

| Category | Common members |
| --- | --- |
| **Base** | typography, icon, divider, container, spacer |
| **Layout** | stack, flex, grid, sidebar, split, resizable, scroll-area |
| **Forms** | input, textarea, select, combobox, checkbox, radio, switch, slider, file upload, date / time picker, password input, phone input, search input, segmented control, fieldset, form orchestrator |
| **Data display** | table, list, card, badge, avatar, tag, stat, timeline, tree, calendar, kbd, code block, JSON tree |
| **Feedback** | alert, toast, banner, progress, spinner, skeleton, empty state |
| **Overlay** | dialog, sheet, drawer, popover, dropdown, tooltip, command palette, menu, context menu |
| **Navigation** | navbar, breadcrumb, tabs, pagination, stepper, bottom nav, sidebar nav |
| **Disclosure** | accordion, collapsible, disclosure, details |

For each candidate that the project does **not** ship and is **not** on the exclusion list, decide whether it represents a real gap.

A candidate is a "real gap" when:

- It's commonly needed in applications of the kind this project targets (infer from the conventions docs and from existing components — a dashboard kit and a marketing kit need different things).
- It can be built mostly from existing primitives / hooks / tokens (i.e. it would feel native, not bolted on).
- Its API surface is well-defined and focused — not a sprawling subsystem.
- A trivial single-element wrapper (`<H1>` around `<h1>`) **does not count**; meaningful abstraction is required.

---

## 4. Evaluate and rank

For each candidate that survives section 3, assess:

- **Value** — How commonly needed? Does it fill a real coverage gap?
- **Feasibility** — Can it be assembled from existing pieces, or does it require new infrastructure (a new primitive, a new token category, a new hook)? Lower infrastructure cost = higher feasibility.
- **Composability** — Will it fit cleanly with existing components, or does it conflict with their conventions?
- **Scope** — Single focused component, or large subsystem? Prefer focused.

Drop anything that scores poorly on two or more axes. Quality over quantity — a strong list of 5 beats a weak list of 20.

---

## 5. Present recommendations

Output **one row per recommendation** in a single table, grouped visually by category, ordered by priority within each group:

| Name | Category | Composition | Effort | Priority | Rationale |
| --- | --- | --- | --- | --- | --- |
| `command-palette` | Overlay | composes `Dialog` + `Input` + `Listbox` | low | high | gap: keyboard-driven actions absent; reuses 3 existing components, no new tokens needed |
| `stat` | Data display | composes `Stack` + `Text` + `Badge` | low | medium | dashboard-style kits commonly need this; no infrastructure |

Column rules:

- **Name** — match the project's naming convention (kebab-case, PascalCase, etc.) inferred from existing components.
- **Category** — one of the categories from section 3, or whatever taxonomy the project uses.
- **Composition** — which existing components/primitives/hooks it would build from. If you'd need new infrastructure, say so explicitly.
- **Effort** — low / medium / high.
- **Priority** — high / medium / low.
- **Rationale** — one short sentence tying the recommendation to a real gap or principle. Cite a profile principle when applicable.

After the table, add a short paragraph noting any **declined** categories ("no Forms gaps found", "color-picker on the exclusion list — skipped"). This makes the recommendation set falsifiable.

---

## 6. Offer to create

After presenting recommendations, ask the user which ones they'd like to scaffold. For each chosen item, invoke `/ui:component:compose <name>` — that skill reads the same Project Profile and produces a component matching the project's conventions.

---

## Important

- Always glob the filesystem at runtime. Never assume the component list is static.
- Never propose anything already on the project's exclusion list.
- Never propose trivial wrappers around a single HTML element with no meaningful abstraction.
- Read the project's existing components for **design philosophy** — some libraries favor monolithic widgets, some favor composable primitives. Match the philosophy you observe.
- If the user constrained the request (e.g. "recommend overlay components only"), narrow accordingly.
- Use the project's vocabulary in the output (pulled from `conventions.vocabularyGlossary` in the profile) so recommendations feel native.
