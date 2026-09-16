# Props Audit — the three rows that need the owner

**Date:** 2026-07-13 · **Shortened:** 2026-09-16 · **Scope at the start:** every public prop on `ui` components, modules, layouts, primitives, and providers. **Living record — resolve rows in place with the commit (CONVENTIONS.md §12.4).**

## State

The audit opened with 110 rows. 107 are terminal: 94 resolved in code, 12 recorded keeps, and 2 recorded "won't do". Their history lives in the commits that closed them, so those rows are gone from this file.

Three rows stay open. None is a defect and none is a research task. Each one asks the owner to set a policy the library does not yet have, and the answer shapes an API the next person inherits. This file holds only those three, and it goes when they close.

The eight cross-cutting themes closed too. **T7** — per-component i18n strings — closed by decision, with no strings catalogue: no app mounts `LocaleProvider`, the workspace carries no i18n dependency, and every `LocaleConfig` field feeds an `Intl.*` formatter. `LocaleProvider` is a formatting provider, and its TSDoc and `PROVIDERS.md` now say so. A catalogue waits for a real second locale.

## Open rows

### 1. Menu — three modes selected by prop presence

`Menu` picks its mode from which props arrive. A `placement` makes a floating dropdown. Without one the wrapper opens as a right-click context menu, or renders as a static inline menu when `defaultOpen` is set. `ContextMenu` already exists as one explicit variant, so the set is half-built.

This is the library's highest-traffic compound, which is why the row is a policy call and not a refactor. §3.6 prescribes explicit variant components over mode props, and the same rule already moved `FileUpload` to three components and split `MarkdownInline` out.

Three answers are open, and the work differs in each:

- **Keep the presence rule, documented.** This is the state today. The `placement` TSDoc and the component TSDoc both name all three modes and say that presence selects them. Choosing this closes the row with no code change.
- **Add `StaticMenu`.** It completes the set `ContextMenu` started, and leaves `Menu` as the dropdown alone. It is the §3.6 answer, and it is a breaking change at every inline call site.
- **Add an explicit `mode`.** One prop names the three modes. It is the smallest diff, and it is the mode prop §3.6 argues against.

### 2. FiltersField — a third wiring mechanism

`FiltersField` wires a child to its filter slot three ways: `cloneElement` sniffing, the `useFilters()` hook, and a function-form `children`. Eight of 33 call sites use the function form.

The function form is arguably the sound one. The `cloneElement` path carries three identity tables — `DECORATION_TYPES`, `EVENT_CALLBACK_TYPES`, and `CLEAR_CALLBACK_TYPES` — which match on the child's component identity. Each table no-ops the moment a consumer wraps its control, because the wrapper is not the component the table names. The failure is silent: the field renders and never binds.

The call is which story is primary. Making the function form primary costs a migration of 25 call sites and removes the silent-failure class. Keeping `cloneElement` primary keeps the terse call site that most demos use, and keeps the wrapper trap.

### 3. ShinyText — eight tuning knobs on a demo-only surface

`ShinyText` exposes `disabled`, `speed`, `color`, `shineColor`, `spread`, `yoyo`, `pauseOnHover`, and `sweep`. The audit found nine; `delay` went, and `direction` became `sweep`.

No app consumes the component. Its demo exercises five knobs — `speed`, `color`, `shineColor`, `spread`, and `sweep` — which leaves `disabled`, `yoyo`, and `pauseOnHover` with no consumer at all.

The policy call is general, and `ShinyText` is only where it surfaced: **is demo-only surface public API?** The audit's own T3 theme calls a prop reserved for a future that never arrived speculative surface, and the closed rows deleted such props throughout. A decorative component is the case where that rule feels least obvious, because its knobs are the point of it.
