# iOS Touch-Hold Selection Audit — 2026-09-30

**Lens:** on an iPhone, a touch hold on a surface with its own hold behavior starts a native text selection. The surfaces are a HoldButton, a context Menu target, and (before #1713) a chart readout. This record keeps the bug, the fixes that failed on a device, and the device test plan that must settle it.

**Status:** *Open* where no pull request closes the row. *Fixed in #N* where a pull request closes it. *Moot* where a fix made the row unnecessary (CONVENTIONS §12.4).

## 1. Symptom

The owner saw these results on a real iPhone, in Chrome for iOS (WKWebView), after each fix deployed to docs.ivoryimage.dev:

- Near 0.5 s into a still hold, iOS shows the loupe (the magnifier).
- After the lift, iOS shows the selection callout ("Copy | Look Up | Translate | Share"). A cleared range shows the callout with no visible highlight.
- The selection can land on text away from the finger, such as a chart axis label or a range across a dashboard tile.
- Sometimes a selection starts before the hold fires (300 ms on a chart, 500 ms on a Menu).
- HoldButton shows the same loupe and callout.

## 2. What failed on the device

| PR | Change | Device result |
|---|---|---|
| #1697 | Remove each range that the page selects during a touch hold (`selectionchange` + `removeAllRanges`), per surface. | The loupe and the callout stayed. |
| #1704 | Move the guard to one home, `hooks/use-touch-hold-selection.ts`, with a boundary gate. | No change in behavior. |
| #1707 | Also set `select-none` on `<html>` from `pointerdown` until 300 ms after the lift, as React Aria does on iOS. | The loupe and the callout stayed. |
| #1710 | Arm the guard on every chart touch press and on HoldButton. Before it, a chart with no click handler never armed the guard. | The loupe and the callout stayed, on charts and on HoldButton. |

The removal PR (#1713) deletes the hook, its gate, and its wiring. The charts stop the problem a different way: a touch on a chart opens no readout, so a hold on a chart does nothing.

The #1707 and #1710 results are the important data. Each ran with `select-none` on the whole page, and the chart root was always `select-none` with `-webkit-touch-callout: none`. The page therefore had no selectable node, and iOS still selected text.

## 3. What the sources say

WebKit main gates the loupe in `-[WKContentView textInteractionGesture:shouldBeginAtPoint:]`. It refuses the loupe when `selectability == UnselectableDueToUserSelectNoneOrQuirk`. `PositionInformationForWebPage.mm` sets that value from `usedUserSelect() == None` on the one node under the touch point.

WebKit fetches that position information about 0.12 s into the press (`_highlightLongPressGestureRecognizer`). The loupe reuses the cached answer while the point stays the same. A style change after that fetch can therefore arrive too late.

React Aria (`textSelection.ts`, `usePress`) sets `-webkit-user-select: none` on `<html>` in `pointerdown`, and restores it 300 ms after the lift. Leaflet does the same for a drag. Neither cancels `touchstart`.

Marking-Menu (#427) states that Safari does not stop its loupe when `pointerdown` is cancelled, and fixed it with a cancelled `touchstart`. That fix also stops a page scroll that starts on the element.

WebKit bug 231161 (iOS 15) reports that `-webkit-user-select: none` did not stop the new loupe.

No source that we found confirms a fix on iOS 17 to 26 that keeps page scroll.

## 4. Open findings

| ID | Finding | Status |
|---|---|---|
| S1 | A touch hold on HoldButton starts the loupe, and the lift shows the selection callout. | Open |
| S2 | A touch hold on a context Menu target starts the loupe and selects text near the finger. | Fixed in #2063 |
| S3 | A selection can start before a 300 ms or 500 ms hold fires. | Fixed in #2063: the guard arms at `pointerdown` |
| S4 | The source-level gate (`user-select: none` on the node under the finger) did not hold on the device in #1707 and #1710. The cause is not known. | Moot: the guard of #2063 holds on the device |

## 5. Hypotheses to test

- **H1.** The installed iOS and WebKit versions gate the loupe differently from WebKit main.
- **H2.** Chrome for iOS adds its own long-press handling over WKWebView.
- **H3.** The position fetch at 0.12 s runs before `pointerdown` reaches the page, so a class set in `pointerdown` arrives too late.
- **H4.** Tailwind v4 `select-none` does not reach the hit node. For example, an SVG node, a portal, or the top layer can use a different style.
- **H5.** The gesture is not the long-press loupe. It can be a tap-and-a-half or a double-tap selection, which has a different gate (S3).
- **H6.** The deployed bundle is older than the fix (a cache at the CDN or in the browser).

## 6. Device test plan

Build one test page, off the docs navigation, with one box for each variant. Each box has a 1 s hold behavior and plain text around it. Run each variant in Safari and in Chrome for iOS. For each run, record the iOS version, the browser, the variant, and the result: loupe (yes or no), callout (yes or no), and the selected text.

| Variant | Setup |
|---|---|
| V1 | The box is `select-none` and `-webkit-touch-callout: none`. No script. |
| V2 | V1, plus `select-none` on `<html>` from `pointerdown` until 300 ms after the lift (React Aria). |
| V3 | V1, plus `select-none` on `<html>` from a capture `touchstart` on `window`. |
| V4 | V1, plus `-webkit-user-select: none` as an inline style on `<html>`, not a class. |
| V5 | V1, plus a non-passive `touchstart` listener that calls `preventDefault`. Record whether a page scroll that starts on the box still works. |
| V6 | V1, and the whole page is `select-none` from the load. This is the control: if V6 fails, no `user-select` fix can work. |
| V7 | V1, plus a tooltip that opens under the finger at 300 ms. |

For each variant, run three gestures: a still hold, a hold that rolls off the edge of the box, and a tap followed at once by a hold (H5).

Connect the iPhone to Safari Web Inspector on a Mac for V1 and V2. Record the node under the finger and its computed `-webkit-user-select`. Load the page with a new query string each time, so that no cache serves an old bundle (H6).

Adopt the variant that passes all three gestures in both browsers and keeps page scroll. If only V5 passes, the owner must decide on each surface whether a scroll that starts on it can stop.
