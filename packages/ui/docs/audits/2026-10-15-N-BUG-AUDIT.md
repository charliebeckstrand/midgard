# Bug audit — 2026-10-15

Letter sweep N of the `packages/ui` components: `components/nav` and `components/number-input`. One scope, 11 files, 757 lines, 3 claims. 2 findings are rows below, both `low`, reach `none`. 1 claim was refuted. The 1 question is settled.

## Scope

The area is the two component folders of the letter N at `main` a961decab. The two folders together are 757 lines, far under one scope, so they are one scope. Each file is in exactly one scope. Tests, benchmarks, and the docs tree are out, per §1.2; no test sits inside the two folders. `utilities/native-context-menu.ts` and `utilities/noop.ts` start with N but are utilities, not components, so the letter sweep leaves them out, as the M sweep left out non-component M files. The shared pieces that the mechanisms reach (`components/input`, `components/form/use-form-value.ts`, `hooks/use-form-reset-sync.ts`, `components/sidebar/sidebar-item.tsx`, `components/button`, `components/link`, `core/compose-event-handlers.ts`, `docs/app/router-link.tsx`, and `react-dom`) are out of the area. The agents read them to trace, and no row is anchored to them.

| Scope | Theme | Files | Lines | Claims |
| --- | --- | --- | --- | --- |
| B01 | Nav (root, bar, list, content, item, `useNavItem`, skeleton) and NumberInput | 11 | 757 | 3 |

This is a letter sweep, not a Clean pass: no lens set and no floor. Every confirmed finding is a row, whatever its severity.

File ownership: no open pull request touches a file of the area at `a961decab`, so no step waits on another thread.

## Method

One sweeper on the scope, a blind verifier on the stripped claims, an overturn pass with the sweep evidence, and one merge pass. A script removed the `evidence` field and checked the stripped text for line references (0 hits) before the blind pass; the blind input sat in its own directory, apart from the evidence. The sweeper read every file in its list (11/11).

The digest held one source: the project record `2026-10-02-component-bug-sweep.md` (outside the repository). It gave the fixed entries B03-C04, B03-C05, and B03-C06 (NumberInput, resolved by #1771), the ruled-out entry B09-C10 (`NavItem`, reach), and the surfaced leads on the NumberInput spread order, the `useA11yRoving` visibility filter, and the docs drawer that relied on the `useNavItem` close. The open record `2026-10-11-BUG-AUDIT.md` has no row in the area. The ledger rows are "Not started" for `nav` and `number-input`; no "Known, not chasing" cell holds an entry. The overturn pass read `react-dom@19.3.0` after the §3.3 resolution check: `pnpm-workspace.yaml` patches only floating-ui and react-router, overrides no React package, and no alias or vendored copy applies.

| Pass | In | Out |
| --- | --- | --- |
| Sweep | 1 scope | 3 claims, 1 lead |
| Verify | 3 stripped claims | 1 confirmed (C02), 1 narrowed (C01, the offcanvas close only), 1 refuted (C03); 2 questions |
| Overturn | 1 sheet plus evidence | no verdict changed; Q2 closed from the code (the docs drawer does not depend on the close); the C02 DOM part verified in `react-dom` |
| Merge | 1 sheet plus the overturn | no groups, 2 independent steps, 1 question (Q1) |
| Settle | 1 answer | Q1 (a): S2 nests `composeEventHandlers` (selection without the default check, close with it); no verdict changes |

## Findings

2 rows: 0 high, 0 medium, 2 low. Reach: 0 `shipped`, 2 `none`. Both rows stand under the M sweep's settled rule: a trigger that the public API builds and no root site builds stays a row (low, reach none).

`◯ OPEN` waits on a question or a fix. `◐ FIXED` is fixed on a branch. `✅ RESOLVED` cites the merged pull request.

| Row | File | Symbol | Verdict | Severity | Reach | Group | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | `components/nav/use-nav-item.ts` | `useNavItem` `handleClick` (offcanvas close) | NARROWED | low | none | — | ✅ RESOLVED ([#2457](https://github.com/charliebeckstrand/midgard/pull/2457)) |
| R2 | `components/number-input/number-input.tsx` | `NumberInput` (native form reset) | CONFIRMED | low | none | — | ✅ RESOLVED ([#2456](https://github.com/charliebeckstrand/midgard/pull/2456)) |

All paths are under `packages/ui/src/`.

## Mechanisms

**R1 (B01-C01).** File: `components/nav/use-nav-item.ts`. Mechanism: the hook builds the click handler by hand and never reads `defaultPrevented`: `use-nav-item.ts:122` `function handleClick(event: MouseEvent<HTMLElement>) {`, `:123` `onClick?.(event as MouseEvent<HTMLButtonElement> & MouseEvent<HTMLAnchorElement>)`, `:125-127` `if (value !== undefined) { item.onValueChange?.(value) }`, `:129-131` `if (!preventClose) { offcanvas?.close() }`. `nav-item.tsx:94` and `components/sidebar/sidebar-item.tsx:99` pass it as `onClick={handleClick}`. Trigger: `<NavItem onClick={(e) => e.preventDefault()}>` (or a `SidebarItem` with the same handler) inside an `OffcanvasContext`, with no `preventClose`. The enclosing drawer still closes. Narrowed: the claim also named the selection change; that part is dropped as the activation the item exists to perform (see Ruled out). Documented intent: `CONVENTIONS.md` §3.9, "A handler composes through `composeEventHandlers`: the consumer's handler runs first, and its `preventDefault()` cancels the component's handler."; "Pass `checkForDefaultPrevented: false` in three cases only. The first is the activation that the component exists to perform."; "Side behavior, such as a preload or a pause on hover, keeps the default." The `useNavItem` TSDoc (`use-nav-item.ts:77-78`) says only that "It composes the click handler from the user `onClick`, the selection change, and the offcanvas close." The documented opt-out is `:46-49` `preventClose`, "Keep an enclosing offcanvas drawer open on click instead of dismissing it." Against: the §3.9 handler example treats the menu close as part of selection, `components/menu/menu-item-utilities.ts:5-6` "runs the consumer's `onClick` first, then selection (`onAction` + close)", `:18` `composeEventHandlers(consumerOnClick, onSelect, { checkForDefaultPrevented: false })(event)`. That split is Q1. No test pins the click under `preventDefault()`; `__tests__/components/nav.test.tsx:177-190` checks only that `onClick` is called. Reach: none. No root `NavItem` or `SidebarItem` passes an `onClick` that calls `preventDefault()`: the root `onClick`s only set state (`docs/pages/components/sidebar/with-header-and-footer.tsx:36` `onClick={() => setActive(item.value)}`, and the same in `sections-divider-and-spacer.tsx`), and `apps/admin/app/(signed-in)/client.tsx` passes none. The docs drawer does not depend on the close after a `preventDefault()`: `docs/app/sidebar.tsx:34` `<SidebarItem href={page.path}>` passes no `onClick`, `handleClick` reaches `docs/app/router-link.tsx:83` `onClick={composeEventHandlers(onClick, (event) => {` as `onClick`, and `core/compose-event-handlers.ts` runs it before the router's `event.preventDefault()`, so a default check inside `handleClick` reads `false` and the drawer still closes. Severity: low. Prior art: `2026-10-02-component-bug-sweep.md` B09-C10, ruled out on reach with "mechanism holds"; its B09 lead (the docs drawer relied on the close) is stale at this head (the overturn trace above, and `docs/engine/components/sidebar.tsx` no longer exists).

**R2 (B01-C02).** File: `components/number-input/number-input.tsx`. Mechanism: the component does not read `controlled` and calls no reset hook: `number-input.tsx:79-83` `const { value: current, setValue: setCurrent, setTouched, } = useFormValue<number>(name, { value, defaultValue, onValueChange })`. It always hands `Input` a defined value, `:156` `value={current ?? ''}`, so `Input` is controlled and its own reset sync is off: `components/input/input.tsx:124` `const uncontrolled = field.attrs.value === undefined`, `:130` `useFormResetSync(inputRef, uncontrolled, (input) => setOwnFilled(input.value !== ''))`. React writes each controlled value into the `value` attribute (`react-dom@19.3.0` `react-dom-client.development.js:1860-1863` `null != value ? "number" === type && element.value == value ? setDefaultValue(element, getToStringValue(element.value)) : setDefaultValue(element, getToStringValue(value))`, `:1928-1929` `function setDefaultValue(node, value) { node.defaultValue !== "" + value && (node.defaultValue = "" + value); }`), so a native reset restores the edited value, fires no change event, and the state stays. Trigger: an unbound, uncontrolled `<NumberInput defaultValue={5} />` in a native `<form>` with a `type="reset"` button; change the value to 9, then reset. The field shows 9, the state stays 9, and `onValueChange` does not fire. Documented intent: `components/form/use-form-value.ts:20-22` "`true` when a `value` prop or a bound field drives the value. An uncontrolled control mirrors a native form reset only while this is `false`."; siblings honour it, `components/rating/rating.tsx:230` `useFormResetSync(firstInputRef, live && !controlled, () => setValue(defaultValue ?? null))`, with the TSDoc `:154-155` "An uncontrolled rating goes back to `defaultValue` on a native form reset, and `onValueChange` reports it.", and `components/mask-input/use-mask-input.ts:72` (R8 of the M sweep, #2450), `components/file-upload/use-file-upload-handlers.ts:101`, `components/switch/switch.tsx:80`. The NumberInput TSDoc says nothing on reset, and `__tests__/components/number-input.test.tsx` has no reset test. Reach: none. `apps` has no NumberInput. The uncontrolled root sites (`docs/pages/components/number-input/decimal-step.tsx:9`, `disabled.tsx:8`, `with-prefix.tsx:7`, `validation.tsx:9`, `:14`, `playground.tsx:4`, `docs/pages/providers/glass/form-controls.tsx:59`) sit in no native form; `docs/pages/modules/grid/editable/bulk-edit.tsx:134-140` is bound by `name` inside a `Form` and has no reset; the one root reset, `docs/pages/components/form/unsaved-changes.tsx:18`, holds no NumberInput. Severity: low. Prior art: NONE; the 2026-10-02 entries B03-C04, B03-C05, and B03-C06 are other mechanisms, fixed by #1771.

## Root-cause groups

None. R1 (`useNavItem`, a hand-built click handler that runs the close whatever the consumer handler does) and R2 (`NumberInput`, a controlled `Input` with no reset mirror for the uncontrolled state) share no file, symbol, or cause.

## Recommended resolution

**S1.** Change: in `NumberInput`, read `controlled` from `useFormValue`. Join a local input ref to the consumer `ref` through `useComposedRef` (`CONVENTIONS.md` §3.9). Add `useFormResetSync(inputRef, !controlled, () => setCurrent(defaultValue ?? null))`. Add one TSDoc sentence on reset, in the words of the Rating sentence. Rows closed: R2. Files: `components/number-input/number-input.tsx`, `__tests__/components/number-input.test.tsx`. Order: first. Depends on: nothing. Gate: none. Test seam: synchronous; a native `<form>` with a `<button type="reset">`, `fireEvent.click`, then `await act(() => new Promise(requestAnimationFrame))`, as in `__tests__/components/mask-input.test.tsx:160-176`.

**S2.** Change: in `useNavItem`, build `handleClick` with `composeEventHandlers`, nested because the helper takes two handlers (`core/compose-event-handlers.ts:33-36`). The inner composition is `composeEventHandlers(onClick, select, { checkForDefaultPrevented: false })`, where `select` calls `item.onValueChange?.(value)` when `value !== undefined`: the activation (§3.9 case one). The outer composition is `composeEventHandlers(inner, close)` with the default check, where `close` calls `offcanvas?.close()` when `!preventClose`. `select` never calls `preventDefault()`, so the outer check reads only the consumer's cancel. Update the TSDoc of `useNavItem` (`use-nav-item.ts:77-78`): a consumer `preventDefault()` cancels the offcanvas close and not the selection change. Update the TSDoc of `preventClose` (`:46-49`) to name `preventDefault()` in `onClick` as the per-click way to keep the drawer open. `nav-item.tsx:94` and `components/sidebar/sidebar-item.tsx:99` keep `onClick={handleClick}`; the signature does not change. Rows closed: R1. Files: `components/nav/use-nav-item.ts`, `__tests__/components/nav.test.tsx`, `__tests__/components/sidebar.test.tsx`. Order: second, for convenience only. Depends on: nothing. Gate: none (Q1 settled). Test seam: synchronous; the `<OffcanvasContext value={{ close }}>` wrapper with a `vi.fn()` close, as in `__tests__/components/sidebar.test.tsx:438-445`. In `nav.test.tsx`, a `<Nav onValueChange={onChange}>` around `<NavItem value="home" onClick={(e) => e.preventDefault()}>`: `close` is not called and `onChange` is called with `'home'`. In `sidebar.test.tsx`, a `SidebarItem` with the same `onClick`: `close` is not called (`SidebarItem` passes no `value`). A regression case: an `href` item with no consumer `onClick` still calls `close` once.

## Open questions

**Q1 (R1, gates S2).** Is the offcanvas close side behavior, or part of the nav item's activation?

- (a) Side behavior (`CONVENTIONS.md` §3.9, "Side behavior … keeps the default"). S2 runs as written: a consumer `preventDefault()` keeps the drawer open, and the selection still changes. R1 stays a row.
- (b) Activation, as the menu item treats its close (`menu-item-utilities.ts:5-6`). R1 becomes deliberate and moves to Ruled out in a settle pass. S2 shrinks to a TSDoc sentence in `use-nav-item.ts` that names `preventClose` as the only opt-out, and the test files leave its file set.

Recommendation: (a). A nav item exists to navigate or select; closing the drawer follows from that, as a preload follows from a hover, and `preventClose` stays the static opt-out.

Answer (2026-10-15, Charlie): "Okay proceed as recommended." Settled (a), side behavior. A consumer `preventDefault()` keeps the drawer open, and the selection still changes. `preventClose` stays the static opt-out. S2 runs; no verdict changes.

## Ruled out

- **B01-C01, the selection-change part.** Guard: `CONVENTIONS.md` §3.9 "The first is the activation that the component exists to perform."; `components/menu/menu-item-utilities.ts:27-28` "Selection is the activation that the item exists to perform, so a consumer `preventDefault()` does not cancel it (CONVENTIONS §3.9)."
- **B01-C03** (`NumberInput` spreads `{...props}` after `type="number"`, so an untyped `type="text"` replaces it). Guard: `number-input.tsx:23-25` `Omit< InputProps, 'type' | 'value' | 'defaultValue' | 'onChange' | 'suffix' | 'min' | 'max' | 'step' >`, and `__tests__/boundary/spread-order-boundary.test.ts:43-45` "`type` on the input family stays out of scope. §3.9 names `type` for the form-submit hazard, which is a button concern, so `type="password"` on a CVV field is a legitimate override." No root passes `type` to a NumberInput.
- **Digest lead B09 (the docs drawer relies on the close after `preventDefault()`).** Guard: `docs/app/router-link.tsx:83` `onClick={composeEventHandlers(onClick, (event) => {` runs the consumer `onClick` (here `handleClick`) before the router's `event.preventDefault()`, so a default check in `handleClick` reads `false` on a docs sidebar click.

## Surfaced, not judged

- (Sweeper) `primitives/active-indicator/active-indicator.tsx` `useActiveIndicator`: the press dip (`animate(scope.current, { scale: 0.99 })`) runs with no reduced-motion gate, and a pointerdown on an item that is not current animates while no indicator span is mounted. Outside the area.
- (Overturn) A Cmd or Ctrl click on an `href` nav item opens a new tab, and the drawer still closes and the selection still changes while the page stays. `docs/app/router-link.tsx:84` returns early with no `preventDefault()`, so S2 does not cover it. A separate trigger.
- (Verifier) A NumberInput with no `name` and no `value` inside a ui `Form` takes no reset from either path; `hooks/use-form-reset-sync.ts:39-40` "A handler after this one can cancel the reset, as `Form` does." Not traced.
- (Verifier) Other `useFormValue` consumers that hand a controlled value to a native input and lack `useFormResetSync` may share the R2 cause. A cross-component probe; not searched beyond the six `useFormResetSync` call sites.
