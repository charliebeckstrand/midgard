# Bug audit — 2026-10-15

Letter sweep O of the `packages/ui` components: `components/odometer`. One scope, 3 files, 148 lines, 2 claims. 2 findings are rows below, both `low`. No claim was refuted. Two questions came up in the blind pass, and the overturn pass settled both from code, so no step waits on the reader.

## Scope

The area is the one component folder of the letter O at `main` a6f8e2867. It is 148 lines, far under one scope, so it is one scope. Tests, benchmarks, and the docs tree are out, per §1.2; no test sits inside the folder. `primitives/offcanvas`, `primitives/option`, `primitives/overlay`, `hooks/observe-scroll-extent.ts`, `types/orientation.ts`, and `utilities/once.ts` start with O but are not component folders, so the letter sweep leaves them out, as the L, M, and N sweeps left out their primitives and utilities. The shared pieces that the mechanisms reach (`hooks/use-prefers-reduced-motion.ts`, `utilities/format-number.ts`, `utilities/format.ts`, `providers/locale`, `components/hold-button/use-hold-button-gesture.ts`, `docs/kit/playground.tsx`, and `motion`) are out of the area. The agents read them to trace, and no row is anchored to them.

| Scope | Theme | Files | Lines | Claims |
| --- | --- | --- | --- | --- |
| B01 | Odometer (root, tween hook, barrel) | 3 | 148 | 2 |

This is a letter sweep, not a Clean pass: no lens set and no floor. Every confirmed finding is a row, whatever its severity.

File ownership: no open pull request touches a file of the area at `a6f8e2867`, so no step waits on another thread.

## Method

One sweeper on the scope, a blind verifier on the stripped claims, an overturn pass with the sweep evidence, and one merge pass. A script removed the `evidence` field and checked the stripped text for line references (0 hits) before the blind pass; the blind input sat in its own directory, apart from the evidence. The sweeper read every file in its list (3/3).

The digest held two sources. The project record `2026-10-02-component-bug-sweep.md` (outside the repository) gave B10-C08 (the default format printed `-0`) and B10-C09 (a consumer `role` overrode the root), both fixed at this head. The project records `2026-10-03-html-semantics-sweep.md` S4-13 (the readout moved from `role="img"` to text with a visually hidden settled copy) and `2026-10-06-motion-features.md` item 3 (a render on each frame, fixed by #2012) are fixed. The open record `2026-10-11-BUG-AUDIT.md` has no row in the area. The ledger row is "Not started" for `odometer`, with no "Known, not chasing" entry.

| Pass | In | Out |
| --- | --- | --- |
| Sweep | 1 scope | 2 claims, 0 leads |
| Verify | 2 stripped claims | 2 confirmed (C01, C02); 2 questions; 3 leads |
| Overturn | 1 sheet plus evidence | no verdict changed; the `aria-atomic` and `aria-relevant` parts of the C01 evidence dropped; Q1 and Q2 settled from code; 1 more lead |
| Merge | 1 sheet plus the overturn | 1 group (G1), 2 independent steps, 0 questions |

## Findings

2 rows: 0 high, 0 medium, 2 low. Reach: 1 `shipped` (the docs playground), 1 `none`. R1 stands under the M sweep's settled rule: a trigger that the public API builds and no root site builds stays a row (low, reach none).

`◯ OPEN` waits on a question or a fix. `◐ FIXED` is fixed on a branch. `✅ RESOLVED` cites the merged pull request.

| Row | File | Symbol | Verdict | Severity | Reach | Group | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | `components/odometer/odometer.tsx` | `Odometer` (consumer `aria-live`) | CONFIRMED | low | none | G1 | ✅ RESOLVED ([#2461](https://github.com/charliebeckstrand/midgard/pull/2461)) |
| R2 | `components/odometer/use-odometer-animated-value.ts` | `useOdometerAnimatedValue` (`duration` change mid-tween) | CONFIRMED | low | shipped | — | ✅ RESOLVED ([#2462](https://github.com/charliebeckstrand/midgard/pull/2462)) |

All paths are under `packages/ui/src/`.

## Mechanisms

**R1 (B01-C01).** File: `components/odometer/odometer.tsx`. Mechanism: the destructure drops only `role`, and the root spreads the rest: `odometer.tsx:46` `// Dropped, so a consumer role cannot make the root a live region.`, `:47` `role: _role,`, `:48` `...props`, `:79` `<span data-slot="odometer" className={cn('tabular-nums', className)} {...props}>`. The type admits `aria-live`: `:24` `} & Omit<ComponentProps<'span'>, 'className' | 'children'>`. The visually hidden settled copy sits inside the root, `:83-84` `<span data-slot="odometer-value" className="sr-only">` / `{resolvedFormat(value)}`, so a consumer `aria-live` makes the root a live region that announces each settled target. The tweened digits are `aria-hidden` (`:80`), so frames are not announced. Trigger: `<Odometer value={n} aria-live="polite" />`; change `value`. The root carries `aria-live="polite"`, and assistive tech announces each new target. Documented intent: `odometer.tsx:35-36` "The root takes no role and is never a live region, and a consumer `role` does not change that."; `:77-78` "The settled target is text in a visually hidden copy, not a live region; a live region announces each intermediate tween value."; `__tests__/components/odometer.test.tsx:69-70` "No live region: the per-frame tween must not be announced." / `expect(el).not.toHaveAttribute('aria-live')`, which covers only the default render; `:82` `it('drops a consumer role, so the root never becomes a live region', ...)`, which rules against a consumer live region under the same `aria-hidden` structure. `CONVENTIONS.md` §3.9 keeps only presentational attributes open to override, and `aria-live` is semantic. Reach: none. `apps` has no Odometer. The root sites `docs/pages/components/odometer/instant.tsx:13` `<Odometer value={value} duration={0} />`, `currency.tsx:16` `<Odometer value={value} format={format} />`, and `playground.tsx:13` `<Odometer {...props} value={value} />` pass no `aria-live`; the playground gets no field for it, because `docs/plugin/api.ts:287` drops props declared in packages. `modules` and `layouts` have no Odometer. Severity: low (the API builds the trigger, no root does; the cost on a hit would be a settled value announced on each change). Prior art: `2026-10-02-component-bug-sweep.md` B10-C09, the same seam, fixed for `role` only.

**R2 (B01-C02).** File: `components/odometer/use-odometer-animated-value.ts`. Mechanism: `duration` is an effect dependency, and the guard passes while a tween runs: `use-odometer-animated-value.ts:45` `if (display.get() === value) return`, `:53` `const controls = animate(display, value, { duration: duration / 1000, ease: easeOutCubic })`, `:55` `return () => controls.stop()`, `:56` `}, [display, value, duration, reduceMotion])`. A new `duration` with the same `value` stops the running tween and starts a new one from the in-flight number, with the full new length and the curve from t = 0. `:17` `const easeOutCubic = (t: number) => 1 - (1 - t) ** 3` is steepest at t = 0, so the digits speed up again in the middle. Trigger: `value` changes from 0 to 100 at `duration={800}`; 400 ms later `duration` changes to 900. The tween ends near 1,300 ms, not 800 or 900, and visibly restarts its ease-out. Documented intent: `odometer.tsx:14` "Tween length in milliseconds."; `use-odometer-animated-value.ts:20-21` "Tweens a display number from its current value toward `value` over `duration` with an ease-out cubic curve"; `:30-31` "A new target starts from the in-flight number, so an interrupted tween continues from where it is." covers a new target only. Precedent: HoldButton binds its `duration` when a run starts, `components/hold-button/use-hold-button-gesture.ts:108` `setFill(1, { ...k.motion.hold, duration: duration / 1000 })`, so a later prop change does not re-time a running fill. No test covers a change of `duration`; `__tests__/components/use-odometer-animated-value.test.ts:5` "Steady-state contract only." Reach: shipped, on one docs page. `docs/pages/components/odometer/playground.tsx:13` `<Odometer {...props} value={value} />` takes `duration` from the playground number field (`docs/kit/playground.tsx:124-130`), which re-renders on each edit (`:408-409`); Randomize (`playground.tsx:15`) and then an edit of Duration inside 800 ms hits the trigger. `apps`, `modules`, and `layouts`: none. Severity: low; the readout and the settled copy still end on the correct target. Prior art: NONE.

## Root-cause groups

- **G1.** The root spreads every consumer prop except `role`, so a consumer `aria-live` breaks the "never a live region" promise. Members: R1. It is the seam of B10-C09.
- R2 is independent.

## Recommended resolution

**S1.** Change: in `Odometer`, destructure `'aria-live': _ariaLive` beside `role: _role` and drop it, with a comment in the words of `odometer.tsx:46`. Keep the type as it is (no `Omit`), as the `role` drop does. Name `aria-live` in the TSDoc sentence at `:35-36`: a consumer `role` or `aria-live` does not change that. Rows closed: R1. Files: `components/odometer/odometer.tsx`, `__tests__/components/odometer.test.tsx`. Order: none; independent of S2. Depends on: nothing. Gate: none (Q1 settled). Test seam: synchronous; `renderUI(<Odometer value={1234} aria-live="polite" />)`, then `expect(bySlot(container, 'odometer')).not.toHaveAttribute('aria-live')`, beside the test at `odometer.test.tsx:82`.

**S2.** Change: in `useOdometerAnimatedValue`, read `duration` through a ref kept current, and take it out of the dependency list at `use-odometer-animated-value.ts:56`. Keep `reduceMotion` in the list, so a reduced-motion switch mid-tween still snaps. A running tween keeps its length, and a new `duration` applies to the next target. Add one TSDoc sentence on that to the hook and to `OdometerProps.duration`. Rows closed: R2. Files: `components/odometer/use-odometer-animated-value.ts`, `components/odometer/odometer.tsx` (the `duration` TSDoc only), `__tests__/components/use-odometer-animated-value.test.ts`. Order: after S1, because both touch `odometer.tsx`. Depends on: nothing. Gate: none (Q2 settled). Test seam: synchronous; `motion` is mocked for every test (`__tests__/setup/module-mocks.ts:21`). Mock `animate` to return `{ stop }` with `vi.mocked(animate).mockImplementationOnce(...)`, as at `odometer.test.tsx:50` and `:101`. With `renderHook`, change `value` from 0 to 100 at `duration: 800`, then re-render with `duration: 900` and the same `value`: `animate` was called once and `stop` was not called.

## Open questions

**Q1 (R1, S1).** Drop only `aria-live`, or every attribute that the root should not carry, and at runtime or in the type?

- Runtime, `aria-live` only: the TSDoc promises only "no role" and "never a live region"; `aria-atomic` and `aria-relevant` make no live region on their own.
- Also `Omit` from `OdometerProps`: a type error tells the consumer, but it changes a public export (`CLAUDE.md` §3.1, §3.4) and splits from the `role` drop.

Answer (2026-10-15, overturn pass, from code): runtime, `aria-live` only, following the `role` precedent at `odometer.tsx:24` and `:46-47`. Reopen if the reader wants `role` and `aria-live` both moved to the type.

**Q2 (R2, S2).** What does a `duration` change in the middle of a tween do?

- (a) It applies to the next target only.
- (b) It re-times the running tween to end at its first end time; this needs elapsed-time bookkeeping and a time seam in the test.
- (c) The restart stays and the TSDoc documents it; R2 moves to Ruled out.

Answer (2026-10-15, overturn pass, from code): (a), following HoldButton (`components/hold-button/use-hold-button-gesture.ts:108`), the one other component that takes a consumer `duration` for a timed run. Odometer is the only effect in `hooks`, `components`, and `primitives` with a consumer `duration` in its dependencies.

## Ruled out

- **B01-C01, frame-by-frame announcement.** Guard: `odometer.tsx:80` `<span ref={displayRef} data-slot="odometer-display" aria-hidden="true">`. Only settled targets would be announced; this lowers the cost, not the verdict.
- **B01-C01 evidence, `aria-atomic` and `aria-relevant`.** Neither makes an element a live region on its own, so neither breaks `odometer.tsx:35-36`. The guard is the absence of `aria-live`, which S1 enforces.

## Surfaced, not judged

- (Verifier) L1: a consumer `aria-label` passes through to the role-less root (`odometer.tsx:48`, `:79`), against the guidance at `:36-37` "The root has no role, so ARIA does not let it take an `aria-label`: put a label in the text around the readout." The TSDoc states a usage rule, not an invariant. If a sweep confirms it, it joins G1 under S1.
- (Verifier) L2: `aria-relevant`, `aria-atomic`, and `aria-busy` reach the root and could shape announcements when an ancestor is a live region.
- (Verifier) L3: other readouts that promise "never a live region" through a list of dropped props may have the same gap. A probe across components.
- (Verifier) L4: the Toast `duration` prop (`components/toast/types.ts:87`, `toast-provider.tsx:23`) is a dismiss timer; its response to a change in the middle of a run was not read.
- (Resolver, S2) A change to `duration={0}` in the middle of a tween no longer snaps; it applies to the next target, as settled Q2 (a) says. A reader may expect `0` to act like reduced motion.
