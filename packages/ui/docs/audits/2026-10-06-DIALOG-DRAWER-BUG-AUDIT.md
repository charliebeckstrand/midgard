# Bug audit — 2026-10-06

Batch 2 of the D audit: Dialog, Drawer, DescriptionList, and Divider in `packages/ui`. One scope (B01), 17 files, 1,249 lines, 11 claims (7 from the sweep, 3 from a re-sweep of `drawer-static.tsx` on a routed lead, 1 raised by the caller from a verifier lead). Seven findings survive the verify passes, one medium and six low, all in Drawer; all seven stay open. Three re-sweep claims fold into earlier rows, and two claims or parts are refuted.

## Scope

The area is the four component directories `components/dialog`, `components/drawer`, `components/description-list`, and `components/divider`, on `main` at `48a523f`. Tests, benchmarks, and the demo tree are left out, because the verifier reads the demos as a consumer root. The shared code under `primitives/panel`, `primitives/overlay`, `hooks`, and `recipes` is outside the area; the sweep read into it to trace a mechanism, and a defect that lives only there is listed under `Surfaced, not judged`.

| Scope | Theme | Files | Lines | Claims |
|---|---|---|---|---|
| B01 | Overlay panels (Dialog, Drawer) and static layout (DescriptionList, Divider) | 17 | 1,249 | 11 |

Files: `dialog/{dialog.tsx 226, index.ts 20, slots.tsx 83}`; `drawer/{drawer.tsx 353, drawer-floor.ts 61, drawer-handle.tsx 38, drawer-panel-props.ts 52, drawer-static.tsx 110, index.ts 21, slots.tsx 90}`; `description-list/{description-list.tsx 50, description-list-skeleton.tsx 55, description-term.tsx 15, description-details.tsx 15, index.ts 17}`; `divider/{divider.tsx 41, index.ts 2}`.

Intent sources: `CONVENTIONS.md` §3.6, §3.9, §7.2, §7.3, §11.3, and `packages/ui/REFERENCE.md` §2, plus the TSDoc, the comments, and the tests. Consumer roots: `apps/admin`, `apps/places`, `packages/ui/src/docs/pages`, `packages/ui/src/modules`, `packages/ui/src/layouts`, and each component's shipped defaults; `packages/ui/src/__tests__` is the weaker root.

## Method

One sweep, one blind verify, one overturn pass with the sweep evidence attached, and one merge pass. The evidence block of each claim was stripped with a script before the blind pass, and the stripped text was checked for line numbers, severities, and fix ideas. Coverage: 17 of 17 files read, none failed to open. No claim came back UNLOCATED.

| Pass | In | Out |
|---|---|---|
| Sweep | 17 files | 7 claims, 2 leads |
| Blind verify | 7 stripped claims, digest | 3 confirmed, 2 narrowed, 1 refuted, 3 questions |
| Overturn | sheet + sweep evidence | 0 overturned; C06 `auto` part held on Q4 |
| Merge | 1 sheet | 1 group, 4 steps |
| Settle | Q1–Q4 answers | S2 and S4 re-derived; C03 closes by a TSDoc note |
| Re-sweep | `drawer-static.tsx` (routed lead) | 3 claims (C08–C10) |
| Blind verify | C08–C10, caller claim C11 | C08→C01, C09→C02 (+ `container` part refuted), C10→C03; C11 confirmed |

## Findings

By severity: 1 medium, 6 low. By reach: 1 shipped (docs playground), 6 none.

Status: `◯ OPEN` — open; `◐ FIXED` — fixed on the batch branch; `✅ RESOLVED (#NNN)` — merged.

| Row | File | Symbol | Verdict | Severity | Reach | Group | Status |
|---|---|---|---|---|---|---|---|
| B01-C01 | `components/drawer/drawer-static.tsx` | `DrawerStatic` | CONFIRMED | low | none | G1 | ✅ RESOLVED ([#2059](https://github.com/charliebeckstrand/midgard/pull/2059)) |
| B01-C02 | `components/drawer/drawer-static.tsx` | `DrawerStatic` | NARROWED | low | none | G1 | ✅ RESOLVED ([#2059](https://github.com/charliebeckstrand/midgard/pull/2059)) |
| B01-C03 | `components/drawer/drawer-static.tsx` | `DrawerStatic` | CONFIRMED | low | none | G1 | ✅ RESOLVED ([#2059](https://github.com/charliebeckstrand/midgard/pull/2059)) |
| B01-C04 | `components/drawer/drawer.tsx` | `DrawerPanel` (`onOpenComplete` report) | NARROWED | low | none | — | ✅ RESOLVED ([#2059](https://github.com/charliebeckstrand/midgard/pull/2059)) |
| B01-C05 | `components/drawer/drawer.tsx` | `DrawerPanel` (`usePanelFit` `dragged` wiring) | CONFIRMED | low | shipped | — | ✅ RESOLVED ([#2059](https://github.com/charliebeckstrand/midgard/pull/2059)) |
| B01-C07 | `components/drawer/slots.tsx` | `DrawerContent` | CONFIRMED | low | none | — | ✅ RESOLVED ([#2059](https://github.com/charliebeckstrand/midgard/pull/2059)) |
| B01-C11 | `components/drawer/drawer-static.tsx` | `DrawerStatic` | CONFIRMED | medium | none | G1 | ✅ RESOLVED ([#2059](https://github.com/charliebeckstrand/midgard/pull/2059)) |

## Mechanisms

### B01-C01 — DrawerStatic paints no default footer

- **File:** `components/drawer/drawer-static.tsx`
- **Mechanism:** the static panel renders only its children — `drawer-static.tsx:106` `{children}` — and `DrawerStaticProps` has no `footer` prop. The real panel renders a default footer after its children: `drawer.tsx:345-347` `<DrawerDefaultFooter>` / `{footer === undefined ? <DrawerClose /> : footer}` / `</DrawerDefaultFooter>`, which shows unless a `DrawerFooter` registers (`primitives/panel/slots.tsx:125` `if (registered || children === undefined || children === null || children === false) {`).
- **Trigger:** `<DrawerStatic>` with `DrawerTitle` and `DrawerBody` and no `DrawerFooter`, swapped for `<DrawerPanel animateOnMount={false}>` with the same children on `onOpenComplete`. A Close row appears on the swap frame, and an `auto` or `fit` panel grows by one footer row.
- **Documented intent:** `drawer-static.tsx:58-60` "stays in step with {@link DrawerPanel} by construction. Pass the drawer's `className`, and the same slot components (`DrawerTitle`, `DrawerBody`, …) for content"; `drawer.tsx:212-213` "With no `<DrawerFooter>` in its children, the drawer shows a footer with the standard Close button." The list of what the static copy leaves out (`drawer-static.tsx:62` "It is a picture, not a dialog. No portal, no motion, no focus trap, and no dialog role.") does not name the footer. The parity test compares classes only (`__tests__/components/drawer-static.test.tsx:57-59`).
- **Reach:** none. The only `DrawerStatic` site is the demo `docs/pages/components/drawer/static-drawer.tsx:12`, which is never swapped.
- **Severity:** low — a one-row jump on the exact frame the component exists to protect, but no root builds the swap.
- **Prior art:** none.

### B01-C02 — DrawerStatic always paints the backdrop

- **File:** `components/drawer/drawer-static.tsx`
- **Mechanism:** `drawer-static.tsx:92` `<div className={k.backdrop({ surface: resolvedSurface, desaturate })} aria-hidden="true" />` is unconditional, and the props have no `modal` or `backdrop`. The overlay paints no backdrop for a non-modal panel and an unpainted one for `backdrop={false}`: `primitives/overlay/overlay.tsx:134` `backdrop = modal,`, `:216` `{(backdrop || catchesPress) && (`, `:225` `: 'absolute inset-0'`.
- **Trigger:** the static copy stands in for `<DrawerPanel modal={false} animateOnMount={false}>`, or for `backdrop={false}`. The scrim vanishes on the swap frame.
- **Documented intent:** `drawer-static.tsx:12` "the {@link DrawerPanel} styling props it has to match"; `overlay.tsx:94` "The flag changes paint only.", so `backdrop` is a styling prop.
- **Reach:** none.
- **Severity:** low — a full-screen scrim vanishes on the swap frame, but no root builds the swap.
- **Prior art:** none. The press-blocking part is ruled out (below).

### B01-C03 — DrawerStatic never squares a full-height `fit` panel

- **File:** `components/drawer/drawer-static.tsx`
- **Mechanism:** `recipes/kata/drawer.ts:65` `fit: ['max-h-full rounded-t-xl', 'data-full:rounded-t-none', css.corner, css.duration],`. Only `usePanelFit` writes `data-full` (`hooks/use-panel-fit.ts:133-136` `panel.toggleAttribute(` / `'data-full',` / `next.block >= ceilingOf(panel, dockExtent(panel, 'height')) - SUBPIXEL,`), wired only at `drawer.tsx:277`. The static copy keeps `rounded-t-xl`. The change eases over 150 ms (`recipes/kiso/ugoki/css.ts:30` `corner: 'motion-safe:transition-[border-radius]'`).
- **Trigger:** `<DrawerStatic height="fit">` with content tall enough to reach the top, swapped for `<DrawerPanel height="fit" animateOnMount={false}>`.
- **Documented intent:** `drawer.tsx:87-89` "`fit` squares them on the steps that stand it there."; `use-panel-fit.ts:51-53` "The panel carries `data-full` while its content asks for more room than it has … Style it to square a corner". No text exempts the static copy.
- **Reach:** none. The `fit` sites (`apps/places/src/components/place-drawer/place-drawer.tsx:588`, `apps/places/src/components/place-form-drawer/place-form-drawer.tsx:156`, `docs/pages/components/drawer/fit-content.tsx:61`) use neither `DrawerStatic` nor `animateOnMount={false}`.
- **Severity:** low — cosmetic and eased, and no root builds it.
- **Prior art:** none.

### B01-C04 — `onOpenComplete` fires before an in-place panel is in the DOM

- **File:** `components/drawer/drawer.tsx`
- **Mechanism:** `drawer.tsx:257-259` `useEffect(() => {` / `if (open && !animateEnter) report()` / `}, [open, animateEnter, report])` runs in `DrawerPanel`'s opening commit, and `hooks/use-open-complete.ts:47-49` `reportedRef.current = true` / `onOpenComplete?.()` calls back at once. The panel sits under `primitives/portal/portal.tsx:108` `<FloatingPortal root={root ?? undefined}>`, which creates its node in a layout effect and renders nothing until then (`@floating-ui/react` dist `:1530` `const [portalNode, setPortalNode] = React.useState(null);`, `:1693` `portalNode && /*#__PURE__*/ReactDOM.createPortal(children, portalNode)`; the pnpm patch keeps `setPortalNode(subRoot);` in `useModernLayoutEffect`, `patches/@floating-ui__react@0.27.20.patch:45`, `:93`). The repo records the deferral elsewhere: `hooks/use-panel-resize.ts:238-240` "mounts on a later commit than the one that opens the panel".
- **Trigger:** `<Drawer open><DrawerPanel animateOnMount={false} onOpenComplete={measure}>`, where `measure` reads the panel. It finds no panel.
- **Documented intent:** `drawer.tsx:37-38` "Fires once the panel has finished arriving — it is docked, at rest, and covering whatever it covers"; `drawer.tsx:46` "on the mount itself, for a panel that arrives in place".
- **Reach:** none in the roots. Test-only: `__tests__/components/drawer.test.tsx:167`, which counts calls.
- **Severity:** low — the callback breaks its contract for a measuring consumer, but no shipped surface passes `onOpenComplete`.
- **Prior art:** none. The "static copy comes down early" part is ruled out (below).

### B01-C05 — a dragged panel eases back to its variant height while it slides out

- **File:** `components/drawer/drawer.tsx`
- **Mechanism:** on close, `hooks/use-panel-resize.ts:283` `setSize(null)` flips `drawer.tsx:279` `dragged: resize.size !== null,` to false. The `usePanelFit` effect re-runs: `use-panel-fit.ts:96` `if (panel === null || dragged) return`, then `:102` `panel.style.removeProperty('height')`, before `:104` `if (!enabled) return`. It strips the drag's pin from the exiting node, and the panel eases back through `recipes/kata/drawer.ts:66` `half: ['h-1/2 rounded-t-xl', css.size, css.duration, RESIZING],` (`css.ts:22` `size: 'motion-safe:transition-[height,border-radius]'`). The hook treats any inline height as its own (`use-panel-fit.ts:98-101` "An inline height on a panel no drag holds is a pin this hook left behind").
- **Trigger:** `<DrawerPanel height="half" handle>`; drag the grip (or resize by keyboard) to about 80%, then close.
- **Documented intent:** `use-panel-resize.ts:267` "The reset rides the close, so the panel slides out at the size it was left at."
- **Reach:** shipped — `docs/pages/components/drawer/playground.tsx:20` `<DrawerPanel {...props}>`, where `handle` and `height` are settable (`docs/kit/playground.tsx:31`). No app or layout site. Test-only: `drawer.test.tsx:490-516`.
- **Severity:** low — a 150 ms cosmetic ease on exit, reachable only from the docs playground.
- **Prior art:** none.

### B01-C07 — DrawerContent does not fill a fixed-height panel

- **File:** `components/drawer/slots.tsx`
- **Mechanism:** `slots.tsx:30-36` gives `createPanel('drawer', …)` no `content` override, so `primitives/panel/slots.tsx:53` `content: contentClass = k.content,` applies: `recipes/kiso/panel/layout.ts:61` `content: 'flex flex-col min-h-0 space-y-4',`, with no `flex-1`. In a `layout.ts:23` `base: 'flex flex-col gap-4',` panel at `h-1/2` or `h-full` (`recipes/kata/drawer.ts:66-67`), Content sizes to its children, so the body's `flex-1` (`recipes/kiso/narabi/flex.ts:17`) has no space to fill.
- **Trigger:** `<DrawerPanel height="full">` (or `half`) with `<DrawerContent><DrawerBody>short</DrawerBody><DrawerFooter>…</DrawerFooter></DrawerContent>`. The footer sits under the short body, mid-panel.
- **Documented intent:** in conflict (Q3). `recipes/kiso/panel/layout.ts:60` "Optional wrapper around body + footer; a Form or similar can wrap both while preserving the panel's slot rhythm."; `__tests__/components/panel-footer.test.tsx:110-117` nests a Footer in Content. Against: the public TSDoc `components/drawer/slots.tsx:62` "`<div>` wrapper for arbitrary drawer content outside the header/body/footer rhythm."
- **Reach:** none. Test-only: `panel-footer.test.tsx:113`, at the default `auto` height, where the symptom does not show.
- **Severity:** low — the footer visibly floats, but no root builds the shape.
- **Prior art:** none.

### B01-C11 — a DrawerClose child of DrawerStatic throws

- **File:** `components/drawer/drawer-static.tsx`
- **Mechanism:** `DrawerClose` renders `PanelClose` (`components/drawer/slots.tsx:49` `<PanelClose>`), which reads a context with no default: `primitives/panel/panel-close.tsx:17` `const { close } = usePanelCloseContext()`; `primitives/panel/panel-close-context.ts:15-18` `createContext<PanelCloseContextValue>(` … `{ error: 'PanelClose must be rendered inside a Dialog, Sheet, or Drawer' },`; `core/create-context.ts:68-69` `if (!hasDefault && (value as unknown) === MISSING) {` / `throw new Error(customError ?? …)`. DrawerStatic's tree (`drawer-static.tsx:90-108`) provides no `PanelCloseContext`.
- **Trigger:** `<DrawerStatic>` with `<DrawerClose />` (or `<DrawerClose><Button/></DrawerClose>`) among its children, mirroring a drawer whose children hold one. The render throws.
- **Documented intent:** contradicted. `drawer-static.tsx:59-60` "the same slot components (`DrawerTitle`, `DrawerBody`, …) for content: they read only defaulted context, so they render here unchanged." The static suite never renders `DrawerClose`.
- **Reach:** none. The only DrawerStatic site (`docs/pages/components/drawer/static-drawer.tsx:12-20`) has no `DrawerClose`. Out-of-root, to show the shape: the drawers DrawerStatic would mirror hold one (`apps/places/src/components/place-drawer/place-drawer.tsx:618`, `apps/places/src/components/place-form-drawer/place-form-drawer.tsx:172`, `docs/pages/components/drawer/fit-content.tsx:82`).
- **Severity:** medium — a render throw on the server paint the component exists for, which the TSDoc's own instruction leads into; reach none keeps it below high.
- **Prior art:** none. Source: a settle-pass verifier lead, issued as a claim by the caller.

## Root-cause groups

- **G1** — `DrawerStatic` mirrors `DrawerPanel`'s classes, but neither what the panel derives from other props or measures at runtime, nor the context its slot children read. Members: B01-C01, B01-C02, B01-C03, B01-C11. Re-sweep claims C08, C09 (backdrop and `modal`), and C10 fold into C01, C02, and C03.

C04, C05, and C07 stand alone. If Q4 reinstates the `auto` part of C06, it joins C05 as G2.

## Recommended resolution

### S1 — report an in-place arrival once the panel node exists

- **Change:** fire the in-place `onOpenComplete` once the portaled panel node exists, not from the opening commit's passive effect — the node as state through a callback ref, as `use-panel-resize.ts:242-244` already does.
- **Rows closed:** B01-C04.
- **Files:** `components/drawer/drawer.tsx`; `__tests__/components/drawer.test.tsx`. Keep `hooks/use-open-complete.ts` unchanged; accordion, collapse, dialog, and sheet call it.
- **Order:** 1.
- **Depends on:** none.
- **Gate:** none.
- **Test seam:** the defect needs the real `FloatingPortal` deferral, which the test configs mock; the fix's seam (a callback ref that sets node state) can be driven with a plain DOM node. A browser test can assert the panel exists inside the callback.

### S2 — bring DrawerStatic's output in line with DrawerPanel (settled by Q2)

- **Change:** three parts, plus a TSDoc note.
  1. Footer: a `footer` prop with DrawerPanel's semantics. DrawerStatic renders `<DrawerDefaultFooter>{footer === undefined ? <DrawerClose /> : footer}</DrawerDefaultFooter>` after `{children}`, the expression of `drawer.tsx:345-347`. `footer={null}` (or `false`) drops it, as `primitives/panel/slots.tsx:125` does for the panel. A server paint cannot see a `DrawerFooter` child (`primitives/panel/panel-footer-context.ts:15-16` "The default is inert"; registration runs in a layout effect, `primitives/panel/slots.tsx:111`), so a caller whose children hold a `DrawerFooter` passes `footer={null}`; the prop's TSDoc states the rule.
  2. Close in the inert panel: DrawerStatic provides `PanelCloseContext` with a no-op `close`, so the standard Close button renders unchanged (`components/drawer/slots.tsx` `data-slot="drawer-close"`). It cannot fire: the panel is `inert` (`drawer-static.tsx:96`).
  3. `modal` (default `true`) and `backdrop` (default `modal`), as `overlay.tsx:133-134`. The backdrop div keeps rendering, painted `k.backdrop(…)` when `backdrop` and `'absolute inset-0'` when not, mirroring `overlay.tsx:222-225`. The root and backdrop still take presses (the ruled-out guard `drawer-static.tsx:64-65`).
  4. C03 closes as a documented limit: the `height` TSDoc of DrawerStatic states that a `fit` copy keeps its rounded top corners, which the drawer squares only after the swap, because a server paint cannot measure.
- **Rows closed:** B01-C01, B01-C02, B01-C03, B01-C11 (the no-op close context of part 2 wraps the children too).
- **Files:** `components/drawer/drawer-static.tsx`, `__tests__/components/drawer-static.test.tsx`; check `packages/ui/docs/COMPONENTS.md` (the DrawerStatic entry) in the same commit (CLAUDE.md §3.4). `components/drawer/slots.tsx` and `primitives/panel/panel-close-context.ts` are imported, unchanged.
- **Order:** 2.
- **Depends on:** S1.
- **Gate:** Q2 (settled).
- **Test seam:** the compare-the-two-trees pattern of `drawer-static.test.tsx`: footer-less panel and static copy carry the same `drawer-footer` and `drawer-close` classes, and neither has a footer with `footer={null}`; with `modal={false}` and with `backdrop={false}` the static backdrop lacks the `k.backdrop` classes; `renderToString(<DrawerStatic>…</DrawerStatic>)` holds the Close button and does not throw; the same with a `<DrawerClose />` child and with `<DrawerClose><Button/></DrawerClose>` (C11).

### S3 — keep the drag's pin through the exit

- **Change:** stop `usePanelFit` clearing an inline height it did not write when `dragged` falls because the panel closed.
- **Rows closed:** B01-C05 (and the `auto` part of C06 if Q4 reinstates it).
- **Files:** `hooks/use-panel-fit.ts` (its only caller is `drawer.tsx:277`) and/or `components/drawer/drawer.tsx`; the hook's test.
- **Order:** 3.
- **Depends on:** none.
- **Gate:** none for C05; Q4 for C06.
- **Test seam:** mount `usePanelFit` on a node with an inline height, flip `dragged` from true to false with `enabled: false`, and assert `style.height`.

### S4 — let DrawerContent fill the drawer (settled by Q3)

- **Change:** drawer only. The bridge has no `content` slot (`recipes/katakana/panel.ts`), so add `content` to the drawer kata as `panel.layout.content` plus `flex.fill` (`recipes/kiso/narabi/flex.ts:17` `fill: 'flex-1',`), and pass `content: k.content` in `createPanel('drawer', …)` (`components/drawer/slots.tsx:30-36`). Update the DrawerContent TSDoc (`components/drawer/slots.tsx:62`) to allow wrapping the body and the footer. The shared `kiso/panel/layout.ts`, Dialog, and Sheet do not change.
- **Rows closed:** B01-C07.
- **Files:** `recipes/kata/drawer.ts`, `components/drawer/slots.tsx`, `__tests__/components/drawer.test.tsx` (or `panel-footer.test.tsx`). The docs API table reads the export-specifier TSDoc, so no separate docs edit.
- **Order:** 4.
- **Depends on:** none.
- **Gate:** Q3 (settled).
- **Test seam:** class assertion: `drawer-content` carries `flex-1`; `dialog-content` and `sheet-content` do not.

## Open questions

### Q1 — the reach rule

`bug-verifier.md` §3.6: "A trigger no consumer in those roots can construct … refutes it." Read as "the public API permits it", the verdicts stand as written. Read as "a root actually builds it", C01, C02, C03, C04, and C07 become REFUTED and C05 survives alone.

**Answer (reader):** "API permits it" — keep C01–C04 and C07 as low findings with reach none. A public export's contract holds even when no app builds the shape yet.

### Q2 — the scope of DrawerStatic's parity

Does the parity contract cover `footer`, `modal`/`backdrop`, and the measured `data-full` of `fit`? Yes: S2 runs and adds optional props to a public export. A `DrawerFooter` child inside the static copy registers with nothing (`primitives/panel/panel-footer-context.ts:15-16` "The default is inert"), and registration runs in a layout effect, so the server paint needs a prop to drop the default footer; `data-full` needs either a measurement after hydration or a prop. No: C01–C03 close as out of contract, and S2 is dropped. A split answer is possible.

**Answer (reader):** "Footer + backdrop only" — S2 adds optional `footer` and `modal`/`backdrop` props mirroring DrawerPanel (C01, C02). C03 closes as a documented limit: a server paint cannot measure, so TSDoc says `fit` squares only after the swap.

### Q3 — which text governs DrawerContent

The public TSDoc (`components/drawer/slots.tsx:62`, published by the docs API table, with the same sentence on Dialog and Sheet) or the kiso comment (`recipes/kiso/panel/layout.ts:60`). Public TSDoc: C07 becomes REFUTED and S4 is dropped. Kiso comment: S4 runs, and its file choice decides whether DialogContent and SheetContent change too.

**Answer (reader):** "Kiso, drawer only" — S4 gives DrawerContent a filling (`flex-1`) override in drawer/slots.tsx and updates its TSDoc to allow wrapping body + footer. Dialog/Sheet stay as a surfaced lead.

### Q4 — a drag pin across a `height` change

Does `drawer.tsx:329-331` ("A dragged height beats the variant's — and a `fit` panel's, which stands down for as long as one is held. It is inline because it is a measurement rather than a step") mean the pin survives a mid-open `height` change, or only that the inline style outranks the variant class? Survives: C06 stays REFUTED. Precedence only: the `auto` part of C06 is confirmed against `drawer.tsx:106-108`, low, docs-playground reach, and joins C05 under S3.

**Answer (reader):** "Pin survives" — C06 stays refuted. Matches the documented rule in use-panel-fit ('beats the content's until the panel closes'), and the `fit` case is already refuted on it.

## Ruled out

- **B01-C02, press blocking:** `drawer-static.tsx:64-65` "The root and backdrop still take pointer presses, so a click while the drawer is on its way cannot land on the page behind it."
- **B01-C02, the panel's `pointer-events-auto` when not modal:** the static panel is `inert` (`drawer-static.tsx:96`), and the class paints nothing.
- **B01-C04, the static copy comes down before the panel is in the DOM:** the portal node is set in a layout effect (patch `:45`, `:93`), which commits before a state update made from the passive callback. React's lane order is reasoned, not quoted.
- **B01-C09, `container` part:** `drawer-static.tsx:67-69` "Positioned `fixed` in place rather than portaled. It resolves against the viewport as long as no ancestor is a containing block for fixed descendants …", with `docs/pages/components/drawer/static-drawer.tsx:6` "The paint containment keeps the fixed layers of the static drawer in this box."
- **B01-C08, B01-C09 (backdrop and `modal`), B01-C10:** duplicates of C01, C02, and C03; they close with those rows. C10's "snap" is eased (`recipes/kiso/ugoki/css.ts:30`).
- **B01-C06, `fit` trigger:** `use-panel-fit.ts:33-34` "It beats the content's until the panel closes."
- **B01-C06, `handle={false}` trigger:** `drawer.tsx:91-92` "The body scrolls within the panel whichever is set, so no height ever strands content".
- **B01-C06, `auto` trigger:** settled by Q4 — the pin survives a mid-open `height` change; `drawer.tsx:329-331` "A dragged height beats the variant's — and a `fit` panel's, which stands down for as long as one is held."

## Surfaced, not judged

- `hooks/use-panel-resize.ts` — `covers`, which becomes the splitter's `aria-valuenow`, is measured only on mount and on a committed drag, so a window resize or a `height` change while open leaves it stale. (sweeper)
- `hooks/use-panel-fit.ts:102` — clears the inline height on every effect re-run while no drag holds, whatever `enabled` is; any dependency change reaches a `half` or `full` panel. (sweeper, verifier)
- `components/sheet/slots.tsx`, `components/dialog/slots.tsx` — SheetContent and DialogContent take the same `k.content`; full-height sheet panels may show C07's mechanism. (verifier)
- `__tests__/components/drawer.test.tsx:144-146` — no suite exercises the slide-landing `onAnimationComplete` path of `onOpenComplete`. (verifier)
- `docs/pages/components/drawer/playground.tsx` — with `modal` Off, the playground controls stay live while the drawer is open, so prop changes reach an open panel. (verifier)
