# ui roadmap

> **Goal: code holds the import direction, the static tier, and the server entry of the foundation, and each shared behavior keeps one home.** The foundation is the code below the components and the modules. This file tracks the work that the code and the apps show is still open there.

## Status

This file covers the foundation layers of `ui`: `core`, `primitives`, `hooks`, `providers`, `recipes`, `utilities`, `layouts`, `structure`, `server`, and `types`. It also covers the gates in `src/__tests__/boundary` and the Biome plugins in `.biome/plugins`. [`src/components/ROADMAP.md`](src/components/ROADMAP.md) covers the components. Each module has its own roadmap: [`chart`](src/modules/chart/ROADMAP.md), [`chat`](src/modules/chat/ROADMAP.md), [`dashboard`](src/modules/dashboard/ROADMAP.md), [`events`](src/modules/events/ROADMAP.md), [`form`](src/modules/form/ROADMAP.md), [`grid`](src/modules/grid/ROADMAP.md), [`kanban`](src/modules/kanban/ROADMAP.md), [`map`](src/modules/map/ROADMAP.md), and [`query`](src/modules/query/ROADMAP.md).

The layers have an order. `utilities` and `types` are at the bottom, with `core` beside them. `hooks` and `primitives` read them, and a hook can read the context of a primitive. `structure`, `recipes`, `components`, `providers`, `layouts`, and `modules` sit above. The shipped source has no cycle of runtime imports, and [`import-cycle-boundary.test.ts`](src/__tests__/boundary/import-cycle-boundary.test.ts) holds it. [`REFERENCE.md`](REFERENCE.md) §1 gives the order of the layers.

Biome holds the order. The `noRestrictedImports` overrides in [`biome.json`](../../biome.json) keep components, structure, layouts, providers, kata, and kumi out of `hooks`. They keep components, structure, layouts, kumi, and kiso out of `primitives`. Kiso and kumi never import upward, and a consumer reaches a recipe only through its kata ([`src/recipes/README.md`](src/recipes/README.md) §3). An override keeps `core`, `utilities`, and `types` from each layer above them. The `hooks` and `primitives` overrides also keep out `modules`, and the `primitives` override keeps out `providers`. No rule holds `server`.

The static tier renders in React Server Components ([`REFERENCE.md`](REFERENCE.md) §2). [`static-component-boundary.test.ts`](src/__tests__/boundary/static-component-boundary.test.ts) scans a curated list of static leaves, the static layouts, each skeleton, and each file of `structure`. It walks the runtime imports from these files, stops at each `'use client'` file, and scans each file that it reaches.

Each behavior that many units share has one home and a gate ([`CONVENTIONS.md`](../../CONVENTIONS.md) §3.10). The import of a name comes from the file that declares it, and [`import-home-boundary.test.ts`](src/__tests__/boundary/import-home-boundary.test.ts) holds it. [`surface-index.test.ts`](src/__tests__/docs/surface-index.test.ts) holds each surface index in `docs` to its barrel. [`density-native-boundary.test.ts`](src/__tests__/boundary/density-native-boundary.test.ts), [`size-scale-boundary.test.ts`](src/__tests__/boundary/size-scale-boundary.test.ts), and [`density-geometry.test.ts`](src/__tests__/core/density-geometry.test.ts) hold density. [`biome-plugin-boundary.test.ts`](src/__tests__/boundary/biome-plugin-boundary.test.ts) proves the pattern of each Biome plugin against its fixtures.

The lazy-load hooks are one stack, not copies. `createLazyModule` in [`utilities/lazy-module.ts`](src/utilities/lazy-module.ts) holds the load. `useLazyModule` reads it, `useIdlePreload` starts it in idle time, `useIdleLoad` joins the two, and `useIntentLoad` adds the load on intent. Each layer adds one thing, so the stack stays.

## Features

1. **A public stored setting (*P2*).** Numbers keeps each game setting in a cookie with a copy in `localStorage`, which tells the other tabs ([`use-game-setting.ts`](../../apps/numbers/src/hooks/use-game-setting.ts)). Its comment says that it does what the appearance choices of `ui` do. That engine is internal in [`stored-choice.ts`](src/utilities/stored-choice.ts) and [`use-stored-choice.ts`](src/hooks/use-stored-choice.ts). Mantine gives `useLocalStorage`, but a cookie must hold the value so that the server paints it ([`CONVENTIONS.md`](../../CONVENTIONS.md) §3.13). Export the hook from `ui/hooks`. It takes the value that the server read, so the hydration render shows it. Numbers then drops its copy, and its tests and a hook test prove the change. The change adds a public export, so surface the API for assent first ([`CLAUDE.md`](../../CLAUDE.md) §3.1).

2. **Docs pages for the layouts (*P2*).** Admin, Elections, Numbers, Picks, and the auth pages of `shared` import `ui/layouts`, and the layouts have no page. [`page-coverage.test.ts`](src/__tests__/docs/page-coverage.test.ts) says so and leaves them out. A layout can render in the main slot of another layout. `BreakpointFrame` with `viewport` gives an example its own viewport, so an example can show a whole shell. Add a page for each layout under `src/docs/pages/layouts`. Then add `layouts` to the sections of the coverage test, and the page smoke test runs axe on each page.

## Pattern cleanup

1. **The props-base gate follows a component tag (*P2*).** [`props-base-boundary.test.ts`](src/__tests__/boundary/props-base-boundary.test.ts) counts only a lowercase JSX tag. A part that renders its element through a component, such as `Flex`, `Field`, or `Button`, is out of its reach. The parts of `FormFilters` had no native base for this reason. Follow a component tag to the element that it renders, and report a part whose props do not reach that element.

## Performance

1. **A bench for the open of a modal overlay (*P2*).** `Overlay` in [`primitives/overlay`](src/primitives/overlay) moves the focus, locks the scroll, seals the page with `inert`, and records its layer and its fade. The seal touches each element outside the panel, so its cost grows with the page. The browser suite benches the popover, the menu, and the tooltip, and no bench opens a Dialog, a Sheet, or a Drawer. Add `__benchmarks__/browser/overlay-open.bench.tsx`. It opens and closes a Dialog over a page of many siblings. Each sample settles on the focus in the panel, or on the return of the focus. Record the findings in a dated section of [`__benchmarks__/browser/README.md`](src/__benchmarks__/browser/README.md) ([`CONVENTIONS.md`](../../CONVENTIONS.md) §12.6).

## Accessibility and testing

1. **A skip link in `SidebarLayout` (*P2*).** A reader with a keyboard tabs through each item of the sidebar before the content. The landmarks meet WCAG 2.4.1, but they help only a reader with a screen reader. GOV.UK Frontend and the U.S. Web Design System give a skip link that shows when it has the focus. Add one to [`layouts/sidebar/sidebar.tsx`](src/layouts/sidebar/sidebar.tsx), first in the tab order, with its text from `defineMessages`. A layout in the main slot of another layout renders none, because `useLandmark` tells it that a main encloses it. A browser test proves that the first Tab shows the link, and that Enter moves the focus to the main slot.

## Not planned

- The `popover` attribute, CSS anchor positioning alone, or `showModal()` for the floating and overlay shells. A native close cannot wait for an exit animation in each engine, `showModal()` does not lock the scroll, and it makes the toasts inert ([`PRIMITIVES.md`](docs/PRIMITIVES.md)).

- A move of `AppearanceSettings` out of `providers`. `UIProvider` also renders the hosts of the toast and the confirm, so the providers layer sits above the components in each case. The move also breaks a public import path for no gain.

- A registry through which a module adds its marks to `rootMarks`. The events module is the one such module, and `ui/server` reaches only its pure engine files. [`server-graph-boundary.test.ts`](src/__tests__/boundary/server-graph-boundary.test.ts) holds that the server graph stays pure.

- One hook in place of `useIdleLoad`, `useIntentLoad`, `useLazyModule`, and `useIdlePreload`. Each adds one layer over one `LazyModule`, and the apps import the two public ones.

- One density module in place of `core/density`, `primitives/density`, and `providers/density`. They are three layers: the Tailwind plugin and the steps, the context, and the friendly levels of a provider.

---

**See also:** [`REFERENCE.md`](REFERENCE.md) · [`src/recipes/README.md`](src/recipes/README.md) · [`docs/`](docs) (the surface indexes) · [`src/__benchmarks__/browser/README.md`](src/__benchmarks__/browser/README.md).
