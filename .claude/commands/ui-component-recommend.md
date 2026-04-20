# Recommend UI Components

TRIGGER when: the user asks to recommend, suggest, propose, or identify new UI components for `packages/ui`, or asks what components are missing, what to build next, or how to expand the library.

You are analyzing the `packages/ui` component library and recommending new components that would complement the existing set. Base your recommendations on gaps in the current library relative to common UI patterns.

## Arguments

$ARGUMENTS

---

## How to recommend

### 1. Read the current component inventory

Scan `packages/ui/src/components/` to get the up-to-date list of existing components. Do not rely on a hardcoded list — the library evolves.

### 2. Read the existing recipes

Scan `packages/ui/src/recipes/katachi/` to understand what styling recipes already exist — some recipes may exist without a corresponding component, indicating planned or partially built work.

### 3. Read the existing primitives and hooks

Scan `packages/ui/src/primitives/` and `packages/ui/src/hooks/` to understand what building blocks are available. Recommendations should leverage these rather than requiring entirely new infrastructure.

### 4. Identify gaps

Compare the current inventory against these common UI component categories:

**Base**: typography, icons, layout containers
**Forms**: text inputs, selects, checkboxes, radios, switches, sliders, file uploads, date/time pickers, color pickers, rating inputs, OTP/PIN inputs
**Data Display**: tables, lists, cards, badges, avatars, tooltips, accordions, timelines, stats/metrics, trees, calendars, carousels, image galleries
**Feedback**: alerts, toasts, progress bars, spinners/loaders, skeletons, empty states, error boundaries, banners, notifications
**Overlay**: dialogs, drawers, sheets, popovers, dropdowns, command palettes, lightboxes
**Navigation**: navbars, sidebars, breadcrumbs, tabs, pagination, steppers, bottom navigation, menus

### 5. Evaluate and rank

For each candidate, assess:
- **Value**: How commonly needed is this component? Does it fill a real gap?
- **Feasibility**: Can it be built with existing primitives, recipes, and hooks? Or does it need new infrastructure?
- **Composability**: Does it compose well with existing components?
- **Scope**: Is it a single focused component, or does it imply a large subsystem?

Prefer recommendations that:
- Fill clear gaps in the library's coverage
- Can be built primarily with existing recipes and primitives
- Are commonly needed in real applications
- Have a well-defined, focused API surface

### 6. Present recommendations

For each recommendation, provide:
- **Name** — the component name (lowercase, matching the naming convention)
- **Category** — which category it belongs to (Base, Forms, Data Display, Feedback, Overlay, Navigation, Layout)
- **Description** — one or two sentences explaining what it does
- **Composition** — which existing components, primitives, or recipes it would use
- **Complexity** — low / medium / high estimate of implementation effort
- **Priority** — how valuable it would be to add (high / medium / low)

Present them grouped by category, ordered by priority within each group. Limit to the most impactful recommendations — quality over quantity. If the user provided specific context (e.g., "I'm building a dashboard app"), tailor recommendations to that context.

### 7. Offer to create

After presenting recommendations, ask the user which components they'd like to create. When they choose, use the `/ui-component` skill to scaffold each selected component.

---

## Important

- Always scan the filesystem for the current state — do not assume the component list is static.
- Do not recommend components that already exist.
- Do not recommend components on the skip-recommend list in `/ui-component` (see *Skip recommend*). Treat that list as authoritative — if a candidate appears there, drop it silently.
- Do not recommend components that are trivial wrappers around a single HTML element with no meaningful abstraction.
- Consider what the existing components reveal about the library's design philosophy — it favors composable primitives over monolithic widgets.
- If the user asks for recommendations in a specific area (e.g., "recommend form components"), focus on that area.
