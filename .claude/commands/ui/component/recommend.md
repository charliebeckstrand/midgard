# ui:component:recommend

TRIGGER when: recommend, suggest, propose, or identify new UI components; "what's missing", "what to build next", "how to expand the library".

Analyze the project's UI inventory and recommend new components that complement what's there. Base recommendations on real gaps, observed composition style, and the design philosophy.

## Arguments

$ARGUMENTS

If the user provided context ("I'm building a dashboard", "we need more form pieces"), narrow recommendations to that area.

---

## 1. Manifest

Read `./manifest.json`. If missing, halt with a pointer to `/repo:manifest`.

Pull:

| Field | Use |
|---|---|
| `packages[*]` filtered to `isFrontend: true`, `framework` in (`react`, `next`), `componentsDir` set | choose the target package. If more than one qualifies, halt and ask the user which; resume after answer. |
| `componentsDir`, `primitivesDir`, `hooksDir`, `tokensDir` | the inventory to inspect |
| `conventions.principles` | weight recommendations (e.g. "compose before invent" biases toward components reusing existing primitives) |

If no qualifying package exists, halt — no UI library to recommend against.

---

## 2. Inventory what exists

Run reads in parallel against the chosen package.

### 2a. Existing components

Glob `componentsDir` one level deep; if results show folder-per-component (subdirectories rather than files), recurse one more level. Record the full list. **Never rely on a memorized list — the library evolves.**

### 2b. Primitives, hooks, and tokens

Glob `primitivesDir`, `hooksDir`, and `tokensDir` (when set). These are the building blocks a new component could reuse without expanding the library's surface area.

### 2c. Partially built work

Look for tokens/recipes entries with no matching component, and components missing demos or tests — both signal in-progress work. Surface in §5 under a separate "in-progress" note, not as recommendations.

### 2d. Project-declared exclusions

Read `CLAUDE.md` and `AGENTS.md` for any "skip-recommend" or "do not scaffold" list. Authoritative — never propose what's declared there.

---

## 3. Identify gaps

Compare findings against this catalog of universal UI categories. Adapt to the project's domain; the catalog is not exhaustive.

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

For each candidate the project doesn't ship and isn't on the exclusion list, decide whether it's a real gap.

A real gap:

- Commonly needed in applications of the kind this project targets (infer from conventions docs and existing components).
- Builds mostly from existing primitives / hooks / tokens (feels native, not bolted on).
- API surface well-defined and focused — not a sprawling subsystem.
- Not a trivial single-element wrapper — earns the abstraction.

---

## 4. Evaluate and rank

Per surviving candidate, assess:

| Axis | Promotes |
|---|---|
| **Value** | commonly needed; fills a real coverage gap |
| **Feasibility** | assembled from existing pieces (high) vs requires new infrastructure (low) |
| **Composability** | fits cleanly with existing components vs conflicts with their conventions |
| **Scope** | single focused component (preferred) vs large subsystem |

Drop anything that scores poorly on two or more axes.

---

## 5. Present recommendations

One row per recommendation, sorted by category first then priority within category:

| Name | Category | Composition | Effort | Priority | Rationale |
| --- | --- | --- | --- | --- | --- |
| `command-palette` | Overlay | composes `Dialog` + `Input` + `Listbox` | low | high | gap: keyboard-driven actions absent; reuses 3 existing components, no new tokens needed |
| `stat` | Data display | composes `Stack` + `Text` + `Badge` | low | medium | dashboard-style kits commonly need this; no infrastructure |

Column rules:

- **Name** — match the project's naming convention from existing components.
- **Category** — one of the categories from §3.
- **Composition** — which existing components/primitives/hooks it would build from. If you'd need new infrastructure, say so.
- **Effort** — low / medium / high.
- **Priority** — high / medium / low.
- **Rationale** — one short sentence tying the recommendation to a real gap or principle. Cite a manifest principle when applicable.

After the table, add a short paragraph noting any **declined** categories ("no Forms gaps found", "color-picker on the exclusion list — skipped").

---

## 6. Offer to create

Ask which recommendations to scaffold. Per chosen item, invoke `/ui:component:compose <name>` sequentially — wait for each before the next.

---

## Rules

- Always glob the filesystem at runtime. Never assume the component list is static.
- Never propose anything on the project's exclusion list.
- Never propose trivial wrappers around a single HTML element with no meaningful abstraction.
- Read existing components for **design philosophy** — some libraries favor monolithic widgets, some favor composable primitives. Match what you observe.
- When the user constrained the request, narrow accordingly.
