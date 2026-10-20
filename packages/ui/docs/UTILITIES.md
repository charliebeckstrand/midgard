# Utilities

> **Quick-glance index of `src/utilities/`.** Small, dependency-free pure helpers shared across the package: numeric clamping and formatting, locale coalescing, and WCAG color-contrast maths. They also cover caret bookkeeping for formatted inputs, the Escape dismiss-layer stack, a shared document-event subscriber, and roving keyboard-navigation math. **Internal:** `utilities` is not a `package.json` export. Reach it by relative import within the package (`from '../../utilities'`), not as `ui/utilities`. The barrel exports only the helpers that a caller imports through it. A caller imports each other helper from its own file, such as `from '../../utilities/contrast'`.

## Numeric

| Export | Summary |
|---|---|
| `clamp` | Constrains `value` to the inclusive range `[lo, hi]`. |
| `pct` | Maps `value` to its percentage position within `[min, max]`; `0` when the range is empty. |
| `parseAspectRatio` | Parses a chart or map `aspectRatio` to its numeric `width / height`, or `null` for a free-form frame. |
| `digitsOnly` | Returns `value` with every non-digit character removed. |
| `reduceNumbers` | Reduces a set of numbers that is not empty to its sum, mean, minimum, or maximum. Each caller keeps its own `count` and empty-set rules. |
| `Aggregation` *(type)* | The built-in aggregation names. `PivotAggregation` and `GridAggFuncName` are aliases of it. |
| `capitalizeFirst` | Returns `value` with its first letter uppercased and the rest unchanged. |
| `parseNumeric` | Parses a data cell to a number, or `null`. It is the one numeric rule for data cells, so a blank gives `null`, not `0`. |
| `finiteOrUndefined` | `value` when it is a finite number, else `undefined`. Import it from `utilities/parse-numeric`. |
| `SECOND` … `YEAR` | Time units in milliseconds. `MONTH` and `YEAR` are approximations, for choosing a unit or a step only. Import them from `utilities/time-units`. |
| `MAX_TIMEOUT` | The longest delay that the platform timer holds, 2³¹−1 ms. Import it from `utilities/time-units`. |
| `formatInteger` | Locale-formats `value` with no fraction digits (cached formatter). An optional `locale` overrides the runtime locale. |
| `formatFraction` | Locale-formats `value` with up to two fraction digits (cached formatter). An optional `locale` overrides the runtime locale. |
| `integerFormat` / `fractionFormat` | The cached formatter behind each helper above for a `locale`. Use it where a memo needs a stable input. |
| `percentFormat` | A `0..1` share as a whole percent for a `locale`, as a stable formatter. |
| `compactFormat` | Compact notation to one fraction digit (`48.2K`) for a `locale`, as a stable formatter. Chart ticks in a narrow frame take it. |
| `resolveFormat` | Resolves a `FormatSpec` to a cached `(value) => string` formatter — number, integer, currency, percent, compact, or prefixed id. |
| `FormatSpec` *(type)* | What to format a value as: a numeric `Intl` format (`number`/`integer`/`currency`/`percent`/`compact`) or a prefixed `id`. |

## Locale

| Export | Summary |
|---|---|
| `resolveLocale` | Coalesces an optional BCP 47 tag to a concrete one, with the runtime locale as the fallback. |

## Color & accessibility

| Export | Summary |
|---|---|
| `contrastRatio` | WCAG contrast ratio (`1`–`21`) between two colors. |
| `relativeLuminance` | WCAG relative luminance of a color, in `[0, 1]`. |
| `readableInk` | The first candidate ink that clears a contrast floor on a background, `4.5` by default. Put the preferred ink first. |
| `parseColor` | Resolves a CSS color (`#rgb` / `#rrggbb`, `rgb(…)`, `oklch(…)`, `white` / `black`) or an `Srgb` triple to gamma-encoded `Srgb`. |
| `WCAG_AA_TEXT` | The WCAG 1.4.3 AA contrast floor for normal-size text: `4.5`. `readableInk` defaults to it. |
| `WCAG_NON_TEXT` | The WCAG 1.4.11 contrast floor for a non-text component or graphical object: `3`. |
| `Srgb` *(type)* | An sRGB color as three gamma-encoded `[0, 1]` channels. |
| `ColorInput` *(type)* | A color to measure: a CSS color string or an `Srgb` triple. |

## Color scale

The sequential-scale primitives the data-driven color charts share — the choropleth and the heatmap.

| Export | Summary |
|---|---|
| `sampleRange` | The color a fraction `t` (`0`–`1`) of the way along an ordered stop list, exact stops verbatim and between-stops mixed in sRGB. |
| `resolveColorBins` | Quantizes a `[min, max]` domain into equal-interval `ColorBin`s sampled from a color range, the last bin pinned to the max. |
| `binIndex` | The equal-interval bin a value falls in — top edge clamped into the last bin, flat domain to bin `0`, non-finite to `null`. |
| `resolveQuantileBins` | Splits values into equal-count (quantile) `ColorBin`s by rank — the skew-aware counterpart to `resolveColorBins` — with the thresholds rows assign by. |
| `quantileThresholds` | The `count - 1` interior cut points splitting values into equal-count quantile buckets; empty for a flat domain (a single bin). |
| `quantileBinIndex` | The quantile bin a value falls in — the count of thresholds it meets or exceeds; non-finite to `null`, bin `0` with no thresholds. |
| `valueExtent` | The `[min, max]` of the finite values, an explicit override, or `null` when nothing spans a domain. |
| `resolveBinScale` | Resolves one color scale: the painted `ColorBin`s and the `assign` rule its marks read, from one resolution per `Binning` (`'linear'` or `'quantile'`). |
| `ColorBin` *(type)* | One bin: its `color` and the `[lo, hi]` value range it covers. |

## Caret & formatted input

| Export | Summary |
|---|---|
| `countMeaningful` | Counts characters in `s[0, end)` matching `keep`; anchors a caret across reformat insert/remove of separators. `keep` gets each character, its index, and `s`. |
| `cursorForCount` | Inverse of `countMeaningful`: string offset past the target-th meaningful char, clamped to bounds. |

## Dismiss layers

| Export | Summary |
|---|---|
| `registerDismissLayer` | Puts a layer on the Escape-dismiss stack at its open order; returns its unregister fn. |
| `nextDismissOrder` | Gives the next open order for `registerDismissLayer`. Call it in the render that opens a layer. |
| `isTopDismissLayer` | True when `layer` is the topmost layer on the dismiss stack. |

## Events

| Export | Summary |
|---|---|
| `clearNativeInput` | Clears an input through the native value setter and a bubbling `input` event, so controlled and uncontrolled consumers both observe it. Returns focus to the input. |
| `createEmitter` | A listener set with no payload: `subscribe` returns the unsubscribe, and `emit` calls a copy of the set. |
| `Emitter` *(type)* | The `{ subscribe, emit }` pair that `createEmitter` returns. |
| `createListenerRegistry` | Handlers for each key behind one shared native listener, which attaches for the first subscriber and detaches after the last. |
| `ListenerRegistry` *(type)* | The `{ subscribe, source }` pair that `createListenerRegistry` returns. |
| `ListenerRegistryOptions` *(type)* | How a registry makes the source of a key, attaches its listener, and whether it keeps an empty entry. |
| `subscribeDocumentEvent` | Subscribes to a document event via one shared listener per type; returns an unsubscribe fn. |
| `subscribeMediaQuery` | Subscribes to a media query via one shared `MediaQueryList` and `change` listener per query string; returns an unsubscribe fn. |
| `matchesMediaQuery` | Whether a media query currently matches, read from the shared `MediaQueryList` when registered (client only). |
| `NO_HOVER_QUERY` | The `(hover: none)` query, which matches a device with no hover, such as a phone. |
| `PHONE_QUERY` | The query that matches a phone: no hover, and a viewport narrower than the `sm` breakpoint. A dropdown `Menu` and a `DatePicker` open as a bottom sheet there. |
| `REDUCED_MOTION_QUERY` | The `(prefers-reduced-motion: reduce)` query, for a caller that reads it outside React. |
| `isNativeContextMenuRequest` | Whether a `contextmenu` event asks for the browser's native menu (Ctrl + secondary-button click) instead of a custom one. |
| `isScrollOverflow` | Whether an `overflow` value lets the user scroll the box: `auto`, `scroll`, or `overlay`. Import it from `utilities/scroll-overflow`. |
| `isScrollbarPress` | Whether a press landed on the scrollbar gutter of an element, not on its content. A floating surface does not dismiss for a gutter press. |
| `printInHiddenFrame` | Prints a document through a hidden iframe, and reclaims the frame after the print or on a failure. |
| `requestIdle` | Calls a callback in idle time. A browser with no `requestIdleCallback`, such as Safari, calls it after a fallback delay, with no deadline. Import it from `utilities/idle`. |
| `cancelIdle` | Cancels a callback that `requestIdle` scheduled. |

## Cookies

| Export | Summary |
|---|---|
| `readCookie` | The value of a cookie in this page, or `undefined` with no such cookie. Import it from `utilities/cookie`. |
| `writeCookie` | Writes a cookie for each path of the site, for a number of seconds, so a server can read it. It is `secure` on HTTPS. Import it from `utilities/cookie`. |

## Measurement

| Export | Summary |
|---|---|
| `measureBox` | The border box of an element, from a `ResizeObserver` entry where the caller has one. |
| `measureContentBox` | The content box of an element. Use it to size a drawing surface, such as a canvas, inside a border or padding. |
| `BorderBox` *(type)* | An element's border box, on the two axes a resize is read along: `inline` and `block`. |
| `ContentBox` *(type)* | An element's content box in CSS px: `width` and `height`. The return type of `measureContentBox`. |
| `forceStyleFlush` | Makes the browser compute styles and layout now, so a CSS transition has a style to start from. It is a call, not a bare `offsetHeight` read, which the React Compiler removes. |

## Keyboard navigation

| Export | Summary |
|---|---|
| `FOCUSABLE_SELECTOR` | Selector for the descendants in the tab order: links with an `href`, enabled form controls, and any element whose `tabindex` is not `-1`. |
| `nextIndexForKey` | Next roving index for a key press (1D or 2D grid), or `null` if unhandled; wraps at both ends. |
| `isArrowKey` | Whether a key is one of the four arrow keys, whatever the direction of the layout. |
| `crossAxisDelta` | Cross-axis arrow delta for an orientation: the pair the main axis doesn't use. |
| `wrap` | Wraps an index into `[0, count)`, so a step past either end lands at the other. |
| `NavigationConfig` *(type)* | Navigation mode for `nextIndexForKey`: 2D grid when `cols` set, else single-axis along `orientation`. |
| `isComposing` | Whether an input method composes a key press. It accepts a React or a DOM keyboard event. |

## Collections & data

| Export | Summary |
|---|---|
| `getOrCompute` | The value under a key in a `Map` or `WeakMap`, computed and stored on the first read — the one get-or-compute step every memo spells. |
| `ComputeCache` *(type)* | The `get`/`has`/`set` interface `getOrCompute` reads; a `Map` and a `WeakMap` both satisfy it. |
| `createKeyedStore` | A store that holds one value for each key and calls only the listeners of the keys whose value changed. |
| `KeyedStore` *(type)* | The store that `createKeyedStore` returns: `get`, `subscribe` for one key, and `publish` of a new reader. |
| `toggleItem` | Returns a copy of `set` with `item` toggled (removed if present, added otherwise); no mutation. |
| `moveItem` | Returns a copy of `items` with the item at `from` moved to index `to`. No mutation. |
| `toggleListItem` | Returns a copy of `list` with `item` toggled: removed if present, else added at the end. No mutation. |
| `sameElements` | Whether two lists hold the same items in the same order, by reference. `undefined` matches only `undefined`. |
| `keyByOccurrence` | Pairs each string with a React-key-safe id that is unique for any input, keying repeats by occurrence index. |
| `rangeKeys` | Builds `count` stable `${prefix}-${index}` keys for fixed-length placeholder loops (skeletons). |
| `isDataColumn` | True for content columns; false for the selection-checkbox and row-actions columns. |
| `noop` | No-op function. |
| `noopSubscribe` | A `useSyncExternalStore` subscription that never fires. It serves a read with no store, and a snapshot that changes only at hydration. |
| `once` | Wraps a thunk so it computes at most once. A throw caches nothing, so the next call runs the thunk again. |

---

**See also:** [`CORE.md`](CORE.md) · [`HOOKS.md`](HOOKS.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
