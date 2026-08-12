# useEffectEvent Adoption — Design Plan — 2026-08-08

What converting the package's ref-to-latest-callback sites to React 19's `useEffectEvent` costs, what it must not touch, and why the two halves look alike but are not. The rule is small; the exclusions are the whole reason this needs a written record.

## Thesis

A hook that must call the caller's newest callback from an effect, without re-running that effect when the callback's identity changes, has one idiom in this package: hold the callback in a ref, assign the ref during render, and read `ref.current` inside the effect. React 19 has a built-in for exactly that shape — `useEffectEvent` — and the idiom has a real defect the built-in does not.

**Assigning a ref during render is an impure render.** React may discard the work: under `StrictMode`, under an interrupted concurrent render, or when an `Activity`-hidden subtree re-renders at low priority. The ref then carries a callback from a render that never committed. The window is narrow and the failure is silent, which is why the sites read as fine.

The conversion is mechanical. Deciding *which* sites are conversion candidates is not, and the wrong call breaks behavior that has no test.

## Current state (verified in tree, 2026-08-08)

`useEffectEvent` reaches three production files — `use-resize-observer.ts`, `use-is-truncated.ts`, and `use-copy-button-state.ts` — each converted for a defect it was already causing, not for idiom.

There are **66** render-phase `Ref.current =` assignments across `src`. Regenerate the list with:

```sh
rg -n "^\t\w+Ref\.current = " src -g '!**/__tests__/**'
```

28 of those hold a callback: 25 are a mechanical swap and 3 need a decision first. The other 38 hold values and must not move. The split does not follow the name — `onChangeRef` and `sizesRef` are assigned in the same way, one line apart in some files.

## The rule

**Convert** a ref whose value is a function the hook calls from an effect, an event listener, or a timer, and which exists only so that effect need not list the callback in its dependencies. Replace the ref and its render-phase assignment with `useEffectEvent`, then call the returned function directly. Drop the ref from the effect's dependency array; Biome 2.5.3 already exempts `useEffectEvent` results from `useExhaustiveDependencies`, verified against a same-shaped control that is flagged.

**Do not convert** a ref that holds a *value*. Two constraints make this a correctness rule rather than a preference:

- **`useEffectEvent` throws if called during render.** A value shadow is often read during render, which the built-in forbids outright.

- **A value shadow can be deliberately advanced early.** `use-controllable.ts` assigns `valueRef` inside `setValue` as well as during render, so batched functional updaters chain off the value the previous updater produced rather than the one the last commit painted. `use-form-reducer.ts`'s `valuesRef` holds the same shape. Converting either changes what a batched update computes from.

The prev-value shadows — `use-frozen-on-close.ts`'s `prevOpenRef`, `use-calendar-month.ts`'s `prevValueRef`, `use-enter-animation.ts`'s `arrivedOpenRef` — are a third excluded kind. They compare against the previous render deliberately, which is the opposite of always holding the newest.

**Decide before converting** three refs that hold a callback but not in the shape the built-in takes. `useEffectEvent` always returns a function, and each of these branches on a callback being absent:

- `use-floating-disclosure.ts`'s `gateRef` and `use-keybindings.ts`'s `ignoreRef` hold *optional* callbacks (`gate?`, `ignore?`). Both feed a presence test — `useKeybindings` computes `hasIgnore` and passes `resolvedIgnore` as `undefined` when omitted, so an always-present effect event would change what tinykeys receives.

- `use-keybindings.ts`'s `bindingsRef` holds a *map* of handlers, not one callback. Converting it means one effect event that dispatches by key, which is a rewrite of the subscription rather than a swap.

## Increments

The sweep wants to land per-owner rather than as one commit, because each converted site's proof is its own suite:

1. **The floating and dismissal hooks — done.** Seven render-phase shadows over five files: `use-floating-ui.ts`'s two `onOpenChangeRef` sites, `use-floating-disclosure.ts`'s `onOpenChangeRef`, `use-dismissable.ts`, `use-escape-layer.ts`, and `use-hover-across-scroll.ts`'s two. The count fell from 67 to 60, and `gateRef`, `refsRef`, `closeReasonRef`, and `prevOpenRef` stayed, as the rule says. No test changed, which is the bar: 188 files and 3,295 tests in the jsdom scope, plus 31 files and 90 tests in the Chromium floating-ui suite, all green before and after.

   Only three of the seven became effect events, and that is the increment's real finding. A shadow exists to make a callback reach its listener fresh; where something else already guarantees that, deleting the shadow is the whole fix and the built-in adds a second wrapper around a wrapper. `useEscapeLayer` is the first case — once it holds one effect event, all three of its callers can hand it their raw callback, so `useDismissable` and the two floating hooks dropped a shadow each and gained nothing. floating-ui is the second: `context.onOpenChange` is already its own effect event, one identity for the whole mount over the newest callback, so the outside-press listener calls it directly and names it as a dependency. `useFloatingPanel`'s `handleOpenChange` is the third and the sharpest — it is now a plain unmemoized closure, because `useFloating` re-wraps whatever it is handed and reads the option in no dependency array, which a probe against the real `useFloating` confirmed by passing a fresh closure across three renders and reaching the newest one. That file ends the increment importing `useEffectEvent` nowhere.

   **Correct a claim this plan made.** `useEffectEvent` does not return a stable identity. `updateEvent` in `react-dom-client.development.js:8688` builds a fresh wrapper every render over a stable inner cell, so the built-in buys latest-callback semantics and the removal of the impure write — never referential stability. Any site converted for stability alone was converted for the wrong reason; increments 2 and 3 should test each candidate against what actually needs the identity.

   The Biome exemption holds, with one condition worth stating. `useExhaustiveDependencies` flags an effect event as a missing dependency while the `useEffectEvent` import is not yet in the file — the rule reads the import to know what it is looking at. A conversion that edits the body before the import therefore reports a false positive mid-edit; land both in one write.

2. **The grid hooks** — `use-grid-navigation.ts` (three sites), `use-grid-editing.ts`, `use-grid-row-grouping.ts`, `use-grid-infinite-scroll.ts`, `use-grid-cursor.tsx`, and `grid-data.tsx`'s `columnLabelRef`.

3. **The component state hooks** — `use-combobox-state.ts`, `use-color-state.ts`, `use-accordion-selection.ts`, `use-password-strength.ts`, `use-resizable-panel.ts`, `use-hold-button-gesture.ts`, `use-form-reducer.ts`'s two callback refs, and `toast-alert.tsx`.

`use-controllable.ts`'s `onValueChangeRef` is a candidate that sits beside an excluded shadow in the same hook; convert the callback and leave `valueRef` alone.

## Proof

Each increment runs the converted hook's own suite plus `test:related` over the touched files. A conversion that changes a test is a conversion that changed behavior — the built-in and the ref hold the same callback, so a passing suite before and after is the bar.

---

**See also:** [`HOOKS.md`](../HOOKS.md) · [`CONVENTIONS.md` §12](../../../../CONVENTIONS.md).
