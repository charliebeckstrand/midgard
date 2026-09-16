# Props Audit — the three rows that need the owner

**Date:** 2026-07-13 · **Shortened:** 2026-09-16 · **Scope at the start:** every public prop on `ui` components, modules, layouts, primitives, and providers. **Living record — resolve rows in place with the commit (CONVENTIONS.md §12.4).**

## State

The audit opened with 110 rows. 107 are terminal: 94 resolved in code, 12 recorded keeps, and 2 recorded "won't do". Their history lives in the commits that closed them, so those rows are gone from this file.

Three rows stay open. None is a defect and none is a research task. Each one asks the owner to set a policy the library does not yet have, and the answer shapes an API the next person inherits. This file holds only those three, and it goes when they close.

The three rows were re-read against the tree on 2026-09-16, before any of them was decided. Several counts and one rule citation were wrong; each is corrected in place below, and the pull request that corrected them carries the detail.

The eight cross-cutting themes closed too. **T7** — per-component i18n strings — closed by decision, with no strings catalogue: no app mounts `LocaleProvider`, the workspace carries no i18n dependency, and every `LocaleConfig` field feeds an `Intl.*` formatter. `LocaleProvider` is a formatting provider, and its TSDoc and `PROVIDERS.md` now say so. A catalogue waits for a real second locale.

## Open rows

### 1. Menu — three modes selected by prop presence

`Menu` picks its mode from which props arrive. A `placement` makes a floating dropdown. Without one the wrapper opens as a right-click context menu, or renders as a static inline menu when `defaultOpen` is set. `ContextMenu` already exists as one explicit variant, so the set is half-built. The selection itself is three lines of `use-menu-state.ts:91-98`.

This is the library's highest-traffic compound, which is why the row is a policy call and not a refactor.

The row first cited "§3.6" for a rule prescribing explicit variant components over mode props. No such rule exists. CONVENTIONS.md §3.6 is about compound components over context, and neither REFERENCE.md nor CLAUDE.md carries a variants-over-modes rule. The `FileUpload` split the row cited as precedent answered a different problem: its `variant` union made `children` legal on two arms and silent on the third, and it stranded `ratio`. That was a type-safety fix on disjoint prop sets. Menu's three modes share one prop set, and no prop is illegal in any mode — `defaultOpen` with a `placement` is a dropdown that starts open — so the precedent does not reach it.

Three answers are open, and the work differs in each:

- **Keep the presence rule, documented.** Close to the state today. The `placement` TSDoc and the component TSDoc both name all three modes and say that presence selects them. Two gaps remain: `open`, `defaultOpen`, and `onOpenChange` carry no TSDoc at all (`menu.tsx:16-18`), so a reader who reaches static inline mode through `defaultOpen` gets nothing; and `useMenuState`'s doccomment (`use-menu-state.ts:70-73`) promises three modes, then lists two joined by a dangling "and".
- **Add `StaticMenu`.** It completes the set `ContextMenu` started, and leaves `Menu` as the dropdown alone. It breaks all 27 static-inline call sites, and every one is a test fixture under `packages/ui/src/__tests__/` — 23 of them in `menu.test.tsx`. No app, demo, or shipped surface renders a static inline menu, so the new component would ship with no production consumer.
- **Add an explicit `mode`.** One prop names the three modes. It is the smallest diff, and it duplicates `placement`'s presence as a second source of truth.

For scale on the other two modes: `placement` carries 12 production call sites, and the context-menu path carries 2, one of which is `ContextMenu` itself.

### 2. FiltersField — two ways to wire one slot

`FiltersField` wires a child to its filter slot two ways: `cloneElement` sniffing and a function-form `children`. Six of 32 call sites use the function form. The row first counted `useFilters()` as a third mechanism; it is a sibling, not a child form. The hook returns the whole bar's `{ value, setValue, layout }`, a consumer of it must re-supply the field's own `name`, and no `FiltersField` child reads it.

The function form is arguably the sound one. The `cloneElement` path carries three identity tables — `DECORATION_TYPES`, `EVENT_CALLBACK_TYPES`, and `CLEAR_CALLBACK_TYPES` — which match on the child's component identity. Each table no-ops the moment a consumer wraps its control, because the wrapper is not the component the table names. The failure is silent: the field renders and never binds.

One case is worse than a no-op. A wrapped `Label`, `Description`, or `Message` fails `isDecoration`, so it takes the one-shot control slot (`filters-field.tsx:163-167`); the real control that follows is passed through untouched and never binds at all. No test covers any wrapper case.

`apps/places` has already made this call for itself. It is the only app that consumes `FiltersField`, it uses the function form at all three of its sites, and `place-filters.tsx:41-46` records why: the element form binds `value={fieldValue ?? null}`, which neither a multi-select `Listbox` nor the relative `DatePicker` accepts.

The call is which story is primary. Making the function form primary costs a migration of 26 call sites and removes the silent-failure class. Seventeen of the 26 sit in `filters.test.tsx`, so the consumer-facing part is nine sites across three files. Keeping `cloneElement` primary keeps the terse call site that most demos use, and keeps the wrapper trap.

One tension belongs with the decision. CONVENTIONS.md §3.6 routes state to descendants through context, "never through render-function children on a root", and [#1150](https://github.com/charliebeckstrand/midgard/pull/1150) retired Sidebar's root render prop on that basis. Whether `FiltersField` is such a root, or a parent that passes data back for the one slot it owns, decides whether the function form is the house shape or a third exception to it.

### 3. ShinyText — eight tuning knobs on a demo-only surface

`ShinyText` exposes `disabled`, `speed`, `color`, `shineColor`, `spread`, `yoyo`, `pauseOnHover`, and `sweep`. The audit found nine; `delay` went, and `direction` became `sweep`. `className` is declared beside the eight, and the type intersects `Omit<ComponentProps<'span'>, 'className' | 'color'>`, so the native span surface is public too.

No app consumes the component. The demo exercises all eight knobs, and the tests add `disabled` (`shiny-text.test.tsx:96`) and `pauseOnHover` (`:108`). The row first read three of them — `disabled`, `yoyo`, and `pauseOnHover` — as having no consumer at all; the demo covers them at `shiny-text.tsx:94`, `:104`, and `:111`. `delay` was the one knob no demo exercised, and it is already gone.

So every surviving knob passes the rule this audit applied throughout: delete a prop that no consumer passes anywhere, demos and tests included. What is left is the general question, and `ShinyText` is only where it surfaced: **is demo-only surface public API?** Answering it needs a policy the library does not have, because the zero-usage rule already decides each prop on its own. A decorative component is the case where that rule feels least obvious, because its knobs are the point of it.
