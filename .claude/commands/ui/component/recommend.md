# ui:component:recommend

TRIGGER when: the user asks to recommend, suggest, propose, or identify new UI components for the project's component library, or asks what's missing, what to build next, or how to expand the library.

Analyze the project's existing UI inventory and recommend new components that complement what's already there. Base recommendations on real gaps, observed composition style, and the project's own design philosophy — not on a generic checklist.

## Arguments

$ARGUMENTS

If the user provided context ("I'm building a dashboard", "we need more form pieces"), narrow recommendations to that area.

---

## 1. Load the Manifest

Read `./manifest.json`. If missing, stop and tell the user to run `/repo:manifest` first — never generate the manifest yourself. Treat a successful load as silent background context; don't mention it to the user.

Pull:

- `packages[*]` — focus on `isFrontend: true`, `framework` in (`react`, `next`), and `componentsDir` set. Ask the user which package if more than one qualifies.
- `componentsDir`, `primitivesDir`, `hooksDir`, `tokensDir` — the inventory to inspect.
- `conventions.principles` — declared rules that weight recommendations (e.g. "compose existing components before inventing primitives" → bias toward components that mostly reuse what's there).

If no qualifying package exists, stop and tell the user the project has no UI library to recommend against.

---

## 2. Inventory what exists

Run these reads in parallel against the chosen package.

### 2a. Existing components

Glob `componentsDir` (one level deep, or following whatever pattern sibling components use — folders vs files). Record the full list. **Never rely on a memorized list — the library evolves.**

### 2b. Primitives, hooks, and tokens

Glob `primitivesDir`, `hooksDir`, and `tokensDir` (when set). These are the building blocks a new component could reuse without expanding the library's surface area.

### 2c. Partially built work

Look for entries in the tokens/recipes directory with no matching component, and components missing demos or tests — both signal in-progress work the user may already plan to finish.

### 2d. Project-declared exclusions

Read `CLAUDE.md`, `AGENTS.md`, and the existing `ui/component/compose.md` skill body for any "skip-recommend" or "do not scaffold" list. Anything declared there is authoritative — never propose it.

---

## 3. Identify gaps

Compare findings against this catalog of universal UI categories. The catalog is a **lens**, not a checklist — adapt to the project's domain and design philosophy.

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

For each candidate the project does **not** ship and is **not** on the exclusion list, decide whether it's a real gap.

A real gap:

- Commonly needed in applications of the kind this project targets (infer from conventions docs and from existing components — a dashboard kit and a marketing kit need different things).
- Mostly built from existing primitives / hooks / tokens (would feel native, not bolted on).
- API surface well-defined and focused — not a sprawling subsystem.
- Not a trivial single-element wrapper (`<H1>` around `<h1>` doesn't count; meaningful abstraction required).

---

## 4. Evaluate and rank

Per candidate that survives section 3, assess:

- **Value** — how commonly needed; fills a real coverage gap.
- **Feasibility** — assembled from existing pieces (high) vs requires new infrastructure (low).
- **Composability** — fits cleanly with existing components vs conflicts with their conventions.
- **Scope** — single focused component (preferred) vs large subsystem.

Drop anything that scores poorly on two or more axes. Quality over quantity — 5 strong beats 20 weak.

---

## 5. Present recommendations

One row per recommendation in a single table, grouped visually by category, ordered by priority within each group:

| Name | Category | Composition | Effort | Priority | Rationale |
| --- | --- | --- | --- | --- | --- |
| `command-palette` | Overlay | composes `Dialog` + `Input` + `Listbox` | low | high | gap: keyboard-driven actions absent; reuses 3 existing components, no new tokens needed |
| `stat` | Data display | composes `Stack` + `Text` + `Badge` | low | medium | dashboard-style kits commonly need this; no infrastructure |

Column rules:

- **Name** — match the project's naming convention from existing components.
- **Category** — one of the categories from section 3.
- **Composition** — which existing components/primitives/hooks it would build from. If you'd need new infrastructure, say so.
- **Effort** — low / medium / high.
- **Priority** — high / medium / low.
- **Rationale** — one short sentence tying the recommendation to a real gap or principle. Cite a manifest principle when applicable.

After the table, add a short paragraph noting any **declined** categories ("no Forms gaps found", "color-picker on the exclusion list — skipped"). Makes the recommendation set falsifiable.

---

## 6. Offer to create

Ask which recommendations to scaffold. Per chosen item, invoke `/ui:component:compose <name>`.

---

## Important

- Always glob the filesystem at runtime. Never assume the component list is static.
- Never propose anything on the project's exclusion list.
- Never propose trivial wrappers around a single HTML element with no meaningful abstraction.
- Read existing components for **design philosophy** — some libraries favor monolithic widgets, some favor composable primitives. Match what you observe.
- If the user constrained the request, narrow accordingly.