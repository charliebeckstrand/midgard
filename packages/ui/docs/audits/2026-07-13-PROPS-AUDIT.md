# Props Audit — the row that needs the owner

**Date:** 2026-07-13 · **Shortened:** 2026-09-16 · **Scope at the start:** every public prop on `ui` components, modules, layouts, primitives, and providers. **Living record — resolve rows in place with the commit (CONVENTIONS.md §12.4).**

## State

The audit opened with 110 rows. 107 are terminal: 94 resolved in code, 12 recorded keeps, and 2 recorded "won't do". Their history lives in the commits that closed them, so those rows are gone from this file.

The three rows that remained were re-read against the tree on 2026-09-16, before any of them was decided. Several counts and one rule citation were wrong, and the pull request that corrected them carries the detail.

Two of the three then closed. **Menu** keeps the presence rule. Its three modes take one prop set and no prop is illegal in any of them, so a `mode` prop would only restate `placement`; and every static inline call site is a test fixture, so a `StaticMenu` would ship with no production consumer. The `Menu` and `useMenuState` doccomments now carry the rule and the reason, and the three state props carry the TSDoc they lacked. **ShinyText** keeps all eight knobs, and the library gains no policy on demo-only surface. The demo exercises every knob, so the zero-usage rule this audit applied throughout already decides each prop on its own. The component doccomment records the keep.

One row stays open. It is not a defect and not a research task. It asks the owner to set a policy the library does not yet have, and the answer shapes an API the next person inherits. This file goes when it closes.

The eight cross-cutting themes closed too. **T7** — per-component i18n strings — closed by decision, with no strings catalogue: no app mounts `LocaleProvider`, the workspace carries no i18n dependency, and every `LocaleConfig` field feeds an `Intl.*` formatter. `LocaleProvider` is a formatting provider, and its TSDoc and `PROVIDERS.md` now say so. A catalogue waits for a real second locale.

## Open row

### FiltersField — two ways to wire one slot

`FiltersField` wires a child to its filter slot two ways: `cloneElement` sniffing and a function-form `children`. Six of 32 call sites use the function form. The row first counted `useFilters()` as a third mechanism; it is a sibling, not a child form. The hook returns the whole bar's `{ value, setValue, layout }`, a consumer of it must re-supply the field's own `name`, and no `FiltersField` child reads it.

The function form is arguably the sound one. The `cloneElement` path carries three identity tables — `DECORATION_TYPES`, `EVENT_CALLBACK_TYPES`, and `CLEAR_CALLBACK_TYPES` — which match on the child's component identity. Each table no-ops the moment a consumer wraps its control, because the wrapper is not the component the table names. The failure is silent: the field renders and never binds.

One case is worse than a no-op. A wrapped `Label`, `Description`, or `Message` fails `isDecoration`, so it takes the one-shot control slot (`filters-field.tsx:163-167`); the real control that follows is passed through untouched and never binds at all. No test covers any wrapper case.

`apps/places` has already made this call for itself. It is the only app that consumes `FiltersField`, it uses the function form at all three of its sites, and `place-filters.tsx:41-46` records why: the element form binds `value={fieldValue ?? null}`, which neither a multi-select `Listbox` nor the relative `DatePicker` accepts.

The migration has a cost the row did not record. `FiltersFieldRenderProps.value` is `unknown`, so a site that binds `value` must cast it. Every one of the five render-form sites does: `value as number | null` at `demos/components/filters.tsx:197` and `:210`, and `picked as PlaceVisitFilter | undefined`, `categories as PlaceCategory[] | undefined`, and the `DatePicker` sibling in `place-filters.tsx`. Outside the tests every control in the element form is a `value` binder — `Input`, `SearchInput`, `Select`, `Listbox`, `DatePicker`, `NumberInput` — so a full migration adds a cast at nearly every site it moves. That trades a silent runtime failure for a silent compile-time one, because a wrong cast type-checks.

So the call is three ways, not two:

- **Keep `cloneElement` primary.** It keeps the terse call site that most demos use, and it keeps the wrapper trap.
- **Make the function form primary.** It removes the silent-failure class and costs a migration of 26 call sites, 17 of them in `filters.test.tsx`. It also adds the casts above, unless the next option comes with it.
- **Make `FiltersField` generic in its slot value.** The render form then hands back a typed value and the casts go, which is what makes the second option pay. The open question is whether a generic belongs on a compound sub-component whose parent holds `Record<string, unknown>`.

One tension belongs with the decision. CONVENTIONS.md §3.6 routes state to descendants through context, "never through render-function children on a root", and [#1150](https://github.com/charliebeckstrand/midgard/pull/1150) retired Sidebar's root render prop on that basis. Whether `FiltersField` is such a root, or a parent that passes data back for the one slot it owns, decides whether the function form is the house shape or a third exception to it.
