# Density Pre-Paint — Design Plan — 2026-09-28

> **Status.** Closed. Increment 1 landed in [#1539](https://github.com/charliebeckstrand/midgard/pull/1539), increment 2 in [#1548](https://github.com/charliebeckstrand/midgard/pull/1548), and
> increment 3 in [#1552](https://github.com/charliebeckstrand/midgard/pull/1552) (Button) and [#1556](https://github.com/charliebeckstrand/midgard/pull/1556) (the toggles). Increment 4 landed in
> [#1559](https://github.com/charliebeckstrand/midgard/pull/1559), and increment 5 in [#1564](https://github.com/charliebeckstrand/midgard/pull/1564). Increment 6 landed in [#1567](https://github.com/charliebeckstrand/midgard/pull/1567) (Sparkline),
> [#1570](https://github.com/charliebeckstrand/midgard/pull/1570), and [#1573](https://github.com/charliebeckstrand/midgard/pull/1573) (Grid); Chart needed no change, as the check in the plan found.
> Increment 7 landed in [#1571](https://github.com/charliebeckstrand/midgard/pull/1571). `SPARKLINE_METRICS` stayed as the fixed geometry of the one
> `viewBox`. The relative slot scope ranked correctly, so the first open question closed in
> [#1548](https://github.com/charliebeckstrand/midgard/pull/1548).

> **Note.** In this plan, an `xl` Button takes the `lg` values. [`2026-10-09-DENSITY-GEOMETRY-PLAN.md`](2026-10-09-DENSITY-GEOMETRY-PLAN.md) replaced that contract. Each ramp now has five values, and `xs` and `xl` are real steps.

How a stored density applies at the first paint of a static shell. It follows [`2026-09-27-DENSITY-ENGINE-PLAN.md`](2026-09-27-DENSITY-ENGINE-PLAN.md) and makes increment 6 of [`2026-09-27-DENSITY-VARIANTS-PLAN.md`](2026-09-27-DENSITY-VARIANTS-PLAN.md) the goal, not an option.

## Thesis

The apps turn on `cacheComponents`. A route then serves one prerendered shell to each user, so the server cannot know the density of a user. The choice lives in `localStorage`. Today `AppearanceProvider` renders `snug` on the server and the stored level one render after hydration, so the whole page resizes after it loads. On the login page the form grows or shrinks in place.

A cookie read in the root layout makes each route dynamic, so it is out. A prerendered variant per density, picked by the proxy, triples the build output for one setting. The platform answer for a preference that the browser holds is a script that writes it to the root element before paint, as `AppearanceScript` does for the theme. That script is a correct design only if the markup is the same for each density and CSS selects the step. So the real work of this plan is the second half: each component that selects its classes from the JS step moves onto the stepped utilities.

## The contract

> **Since reversed.** The root does not hold `data-density`. [#1689](https://github.com/charliebeckstrand/midgard/pull/1689) wrote the root step as `data-density-root`. Then [#1692](https://github.com/charliebeckstrand/midgard/pull/1692) made `md` the base of each stepped class and marked a root at another step with a class (`rootDensityClasses` in `core/density/steps.ts`). The root mark of the contract and of increment 1 below is that class.

- **The root is the app scope.** `AppearanceScript` writes `data-density` on `<html>` from the stored level before paint. `AppearanceProvider` keeps it in sync on a change, as it does the `dark` class. `AppearanceProvider` no longer renders a `DensityProvider` span. A nested `DensityProvider` still writes its own scope.
- **Markup does not depend on the ambient step.** A component with no `size` writes the same classes at each density. Stepped utilities (`density-px-[2,3,4]`) and `density-*` variants select the step from the nearest scope. This is the rule of the engine, applied to the client tier too.
- **An explicit `size` is a scope.** It writes `data-density` on the element of the component and opens the `Density` context, as on Card. It is in the server markup, so it is correct at the first paint.
- **The context holds explicit scopes only.** `useDensityNullable()` returns the nearest explicit scope, or `null` at the app root. `null` means "the root decides". The portal roots of Overlay and FloatingSurface already write nothing for `null`, so a portaled panel follows `<html>`.
- **No number in JS picks what the shell paints.** A reader that needs the step as a number (`useDensityStep` with no scope) reads `<html data-density>` through `useSyncExternalStore`, with `md` as the server snapshot. Only an allowlist may call it, and increment 6 moves each painted value out of that path, so the value in JS feeds only work after mount.
- **A control slot is a relative scope.** The slot writes `data-density="slot"`. The rungs read it as a scope one step below the scope above it, so the slot needs no JS `stepDown`. See increment 2.

## Inventory

About 45 files read the density context. Classified by what the step feeds:

- **Classes only (move onto stepped utilities).** Button, Input, PasswordInput (through Input), Textarea, the Listbox and Combobox triggers and `SelectTrigger`, TagInput, ControlFrame radius (`kata/control` `frameRadius`), the control bridge (`kiso/control/density` and `size`), Checkbox, Radio, and Switch (through `useControlToggle`), Slider, RangeSlider, Rating, ProgressBar, ProgressGauge, Calendar, CalendarPicker, DatePicker and its footer, ColorPanel, the ColorPicker trigger and swatch, the Popover padding (`paddingForSize`), SidebarItem. Each recipe holds plain classes per step, so each converts one to one.
- **Scope only (write a scope only for an explicit `size`).** Drawer, Group, the Menu, Listbox, Combobox, ColorPicker, and Popover panels, Calendar. Today each re-broadcasts the JS step. With no `size`, it writes nothing and its subtree follows the DOM.
- **Derived scopes (`stepDown`).** The Input and select affixes, the Textarea action row, the ChatListItem actions, and the Nav and Sidebar item slots.
- **Numbers in JS (stay readers).** Sparkline (`SPARKLINE_METRICS`: SVG size and geometry), Chart (`CHART_METRICS.tickTarget`), Grid (`ROW_HEIGHT_BY_DENSITY` for the virtualizer estimate, column sizing, and the overlay step for its menus). Tree sets its indent inline from `indentStep` in rem.

## Increments

Each increment is one pull request and moves its components into `density-native-boundary.test.ts`.

1. **Root scope.** `AppearanceScript` writes the stored step on `<html>`. `AppearanceProvider` syncs it and drops the root `DensityProvider`. `useDensityStep` with no scope reads the root through a store, with `md` on the server. The rungs read `:root[data-density]` as depth 0, `useDensityNullable` becomes `useDensityScope`, and the docs theme script gains the density line. The components that are already native (Heading, Card, Badge, Table, List, Option, Menu rows, Tabs, Sidebar layout) take the stored step at first paint from this increment on. The others still take `md` until hydration, as they do today, so nothing regresses. A browser test renders server markup with `<html data-density="sm">` and no hydration, and it checks a Card and a Heading at `sm`.
2. **Control foundation.** The control bridge folds its `density` and `size` axes into stepped utilities. ControlFrame, Input, PasswordInput, Textarea, `SelectTrigger`, the Listbox and Combobox triggers, and TagInput stop reading the context. The relative slot scope lands here: the slot writes `data-density="slot"`, so `rungs.ts` already counts it as a scope, and a rung matches it one step below the scope above it (`[data-density='md'] [data-density='slot'] &` takes the `sm` rules). A value on the one attribute keeps the depth selectors as short as they were. The DatePicker and ColorPicker triggers share the control bridge, so they write their JS step as a scope until increment 4. `DensitySlot` gives the slot step to a client child, such as Button, until that child is native. The affixes and the Textarea action row move onto it, and `stepDown` leaves them. The affix compensation constants of `kiso/control/affix` keep their meaning, because the stepped-down chip is the same.
3. **Button and the toggles.** Button (five steps, `xl` takes the `lg` values), ToggleIconButton, Checkbox, Radio, Switch, Slider, RangeSlider, Rating, ProgressBar, ProgressGauge. `skeleton-parity.test.tsx` measures each against its skeleton at each step. After this increment the login and register pages paint at the stored step. It lands in two pull requests: Button first, then the toggles. A Kbd and the LoadingDots take their `md` default under `density-any`, so the stepped projections of Button win over the default. The second pull request removes `useControlToggle`, because Checkbox, Radio, and Switch read no step. It also fixes a class of a pseudo-element: a pseudo-element ends a selector, so a stepped class after it (`before:density-rounded-ring-[…]`) writes no rule that a browser matches. The density variant comes first, and the `density-[xs,sm]` variant names several steps in one class. Tailwind wraps the selector list of such a class in `:is()`, which gives each selector the highest specificity of the list. So the root rung moves to its own layer, `density-0`, below each depth, and the rank does not use specificity. A boundary test stops a density class after a pseudo-element.
4. **Panels and scopes.** Calendar, CalendarPicker, DatePicker and its footer, ColorPanel, ColorPicker, the Popover padding, and the Menu, Listbox, Combobox, and Drawer panels. Group and Drawer write a scope only for an explicit `size`. `density-portal.test.tsx` gains a case for a panel opened at the root with `<html data-density="sm">`. The Menu, Popover, Listbox, Combobox, DatePicker, and ColorPicker panels also open a scope only for an explicit `size`. Without one, a panel follows the scope that its portal carries, or the root. The DatePicker and ColorPicker triggers drop their transitional scope, and the icon and the chips of the DatePicker trigger step down in a slot scope.
5. **Items and slots.** SidebarItem and NavItem slots and the ChatListItem actions move onto the relative slot scope. Tree and JsonTree indent by structure: each nested group pads its start with one stepped class, so the depth needs no inline value. Today Tree computes an inline `paddingLeft` from per-step rem numbers that repeat the chevron width and the row gap, and JsonTree uses a fixed 1.25rem that ignores density. The NavItem chrome is fixed at `md`, so its slots keep a fixed `sm` scope, and a relative slot would step them away from the chrome. The windowed JsonTree renders a flat list with no nested group, so its row root pads its start by the depth, in the same step as a nested group (`ps-5`).
6. **Numeric readers.** Each moves its painted value into CSS, so the shell is right at the first paint. It lands in three pull requests: Sparkline, Chart, and Grid.
   - **Sparkline.** The SVG takes its box from stepped `density-w` and `density-h` classes and draws in one fixed `viewBox`, which scales uniformly. Today the three steps have different aspect ratios (64×24, 96×32, 128×40) with no reason behind them, so the steps move to one ratio, 3:1 (72×24, 96×32, 120×40). Each step is then the same drawing at a different scale: circles stay round, bar corners stay even, and strokes scale with the box. `SPARKLINE_METRICS` goes. Charlie chose this over a stretched `viewBox` that kept the old sizes.
   - **Chart.** The density sets only the tick cap (3, 4, or 5). The axis renders the tick set of each cap, and `density-*` variants show the set of the nearest scope. A tick set is a few labels, so the cost is a few DOM nodes. The chart measures its height on the client, so increment 6 first checks what the server renders. If the axis never paints before the measurement, the chart keeps the JS reader and needs no change. The check: with no `width`, the server renders an empty frame (no ticks, no marks), and the chart measures in a layout effect before the first paint, when the root step is already read. So the chart keeps the JS reader. An explicit `width` draws the axis on the server at the `md` tick cap. No app sets one.
   - **Grid.** The grid passed the resolved step to Table as `size`, so the server wrote an `md` scope on each grid. It now writes a scope only for an explicit `density` or `condensed`, and the resize metrics and the reveal padding are stepped classes. Its rows already size from the stepped classes of Table. `ROW_HEIGHT_BY_DENSITY` (36, 44, 52) is a hand-kept copy of the cell padding, so it goes. The virtualizer takes its estimate from the measured height of the first rendered row, and it measures each row as it does today. Until a row renders, the body holds the loading skeleton, and the estimate is the height of one skeleton row from the stepped classes. The table reads it when it attaches, in the commit before the first client paint. A new density reads it again. A row in a reveal changes height, so the table does not read rows while it resizes. The server has no window size, so it renders no virtual rows that could be wrong.

   A gate lists the files that may call `useDensityStep`. Each other file fails it.

7. **PDF magnifier.** The lens sizes (140, 180, 240) have uneven steps. They move to Tailwind size classes on an even scale, 144, 192, and 240 (`size-36`, `size-48`, `size-60`), and the offset math reads the rendered size of the lens. `sizeSteps` goes. This is not a density change, but it removes the same kind of hard-coded size.

A follow-up after this plan: the chart header, legend, and label constants (`CHART_HEADER_LINE_HEIGHT`, `LEGEND_ROW_HEIGHT`, the character widths) copy the rendered CSS into JS. Chart needs evidence for each change, so it gets its own investigation.

## Costs accepted

- **CSS size.** The relative slot scope adds a second selector set to the rungs of each step. The CSS grows with the number of rungs, not with the number of components, and the repeats compress well. Increment 2 reports the gzip size of the app CSS before and after in its pull request, and it merges the slot selectors into the existing rules with `:is()` where the rank allows it.
- **Sparkline widths.** The `sm` sparkline grows from 64 to 72 wide, and the `lg` one shrinks from 128 to 120.
- **Chart axis nodes.** If the chart axis paints on the server, it renders three tick sets and shows one.

## Mitigated

- **The depth cap.** The root scope on `<html>` would use one of the 6 ranked depths on each page. The rungs read `:root[data-density]` as depth 0 and count only the scopes under it, so the trees keep all 6 depths. **Since reversed.** [#1679](https://github.com/charliebeckstrand/midgard/pull/1679) cut the ranked depths to three, and [#1932](https://github.com/charliebeckstrand/midgard/pull/1932) to two.
- **The change to `useDensityNullable`.** It now means "the nearest explicit scope, or `null` at the root". A silent change of meaning is worse than a new name, so it becomes `useDensityScope`, and each caller gets a type error until it is read again. Overlay, FloatingSurface, and `useDensityLevel` call it. The portal roots want the new meaning, and `useDensityLevel` serves Grid, which increment 6 moves. No app calls it.
- **Pages with no `AppearanceScript`.** The docs site has its own theme script in `src/docs/index.html`. It gains the density line, so the docs follow the stored density at first paint too. Tests and pages with no script have no root scope, and the `md` rung applies, as it does today.
- **Script failure.** Storage access can throw (blocked cookies, embedded contexts). The script then writes nothing, the `md` rung applies, and `AppearanceProvider` writes the attribute after hydration. That is the behavior of today, not a new failure.

## Rejected

- **One render at `md` for the numeric readers.** The first draft accepted it. Increment 6 now removes it.
- **A cookie in the root layout.** Each route becomes dynamic, against `cacheComponents`.
- **A cookie in the gated layouts only.** It works while those layouts stay dynamic, and each route that moves into the static shell gets the jump back.
- **A prerendered variant per density, picked by the proxy.** No script and a static page, but three builds of each route, a hidden route segment in both apps, and more again when the theme joins.
- **CSS custom properties or CSS Modules.** They move styling out of Tailwind classes, which the variants plan rejected. The blocker is where the step is resolved, not where the styles live.

## Open questions

- The relative slot scope is new to the rungs. Increment 2 proves it with a browser test before the affixes move. If the selectors do not rank correctly, the slots keep the JS `stepDown`, and only the slot contents take one render after hydration.
- The theme can move from a class to an attribute set by the same code path. That is out of scope here.
