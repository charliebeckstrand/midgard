# Utilities

> **Quick-glance index of `src/utilities/`.** Small, dependency-free pure helpers shared across the package: numeric clamping and formatting, locale coalescing, and WCAG colour-contrast maths. They also cover caret bookkeeping for formatted inputs, the Escape dismiss-layer stack, a shared document-event subscriber, and roving keyboard-navigation math. **Internal:** `utilities` is not a `package.json` export. Reach it by relative import within the package (`from '../../utilities'`), not as `ui/utilities`.

## Numeric

| Export | Summary |
|---|---|
| `clamp` | Constrains `value` to the inclusive range `[lo, hi]`. |
| `pct` | Maps `value` to its percentage position within `[min, max]`; `0` when the range is empty. |
| `parseAspectRatio` | Parses a chart or map `aspectRatio` to its numeric `width / height`; `null` when the ratio is off or unparseable, which leaves the frame free-form. Both terms must be positive, so a signed `'-4/3'` falls through the same way its numeric twin does. |
| `digitsOnly` | Returns `value` with every non-digit character removed. |
| `toNumericCell` | Coerces a raw data cell to a number. Numbers pass through and non-blank numeric strings parse. A blank (`null`, `''`, whitespace) becomes `NaN`, not `0`; callers finite-filter. |
| `formatInteger` | Locale-formats `value` with no fraction digits (cached formatter). |
| `formatFraction` | Locale-formats `value` with up to two fraction digits (cached formatter). |
| `formatPercent` | Locale-formats a `0..1` share as a whole percent (cached formatter). |
| `resolveFormat` | Resolves a `FormatSpec` to a cached `(value) => string` formatter — number, integer, currency, percent, compact, or prefixed id. |
| `FormatSpec` *(type)* | What to format a value as: a numeric `Intl` format (`number`/`integer`/`currency`/`percent`/`compact`) or a prefixed `id`. |

## Locale

| Export | Summary |
|---|---|
| `resolveLocale` | Coalesces an optional BCP 47 tag to a concrete one, with the runtime locale as the fallback. Resolved once, because `Intl.DateTimeFormat` construction has no cache and the process locale cannot change. |

## Colour & accessibility

| Export | Summary |
|---|---|
| `contrastRatio` | WCAG contrast ratio (`1`–`21`) between two colours. |
| `relativeLuminance` | WCAG relative luminance of a colour, in `[0, 1]`. |
| `meetsContrast` | Whether two colours clear a threshold — a named level (`'AA'`, `'non-text'`, …) or a raw ratio; defaults to `'AA'`. |
| `readableInk` | The first candidate ink that clears the threshold on a background — lead with the preferred ink (e.g. white) to get it wherever it holds. |
| `contrastFloor` | Resolves a `ContrastThreshold` (named level or raw ratio) to its numeric floor. |
| `parseColor` | Resolves a CSS colour (`#rgb` / `#rrggbb`, `rgb(…)`, `oklch(…)`, `white` / `black`) or an `Srgb` triple to gamma-encoded `Srgb`. |
| `WCAG_AA_TEXT` · `WCAG_AA_LARGE` · `WCAG_NON_TEXT` · `WCAG_AAA_TEXT` · `WCAG_AAA_LARGE` | Standard WCAG contrast floors: `4.5` · `3` · `3` · `7` · `4.5`. |
| `ContrastLevel` *(type)* | A named WCAG floor: `'AA'` · `'AA-large'` · `'AAA'` · `'AAA-large'` · `'non-text'`. |
| `ContrastThreshold` *(type)* | A `ContrastLevel` or a raw ratio, taken by `meetsContrast` / `readableInk`. |
| `Srgb` *(type)* | An sRGB colour as three gamma-encoded `[0, 1]` channels. |
| `ColorInput` *(type)* | A colour to measure: a CSS colour string or an `Srgb` triple. |

## Colour scale

The sequential-scale primitives the data-driven colour charts share — the choropleth and the heatmap.

| Export | Summary |
|---|---|
| `sampleRange` | The colour a fraction `t` (`0`–`1`) of the way along an ordered stop list, exact stops verbatim and between-stops mixed in sRGB. |
| `resolveColorBins` | Quantises a `[min, max]` domain into equal-interval `ColorBin`s sampled from a colour range, the last bin pinned to the max. |
| `binIndex` | The equal-interval bin a value falls in — top edge clamped into the last bin, flat domain to bin `0`, non-finite to `null`. |
| `resolveQuantileBins` | Splits values into equal-count (quantile) `ColorBin`s by rank — the skew-aware counterpart to `resolveColorBins` — with the thresholds rows assign by. |
| `quantileThresholds` | The `count - 1` interior cut points splitting values into equal-count quantile buckets; empty for a flat domain (a single bin). |
| `quantileBinIndex` | The quantile bin a value falls in — the count of thresholds it meets or exceeds; non-finite to `null`, bin `0` with no thresholds. |
| `valueExtent` | The `[min, max]` of the finite values, an explicit override, or `null` when nothing spans a domain. |
| `ColorBin` *(type)* | One bin: its `color` and the `[lo, hi]` value range it covers. |

## Caret & formatted input

| Export | Summary |
|---|---|
| `countMeaningful` | Counts characters in `s[0, end)` matching `keep`; anchors a caret across reformat insert/remove of separators. |
| `cursorForCount` | Inverse of `countMeaningful`: string offset past the target-th meaningful char, clamped to bounds. |

## Dismiss layers

| Export | Summary |
|---|---|
| `registerDismissLayer` | Pushes a layer onto the Escape-dismiss stack; returns its unregister fn. |
| `isTopDismissLayer` | True when `layer` is the topmost layer on the dismiss stack. |

## Events

| Export | Summary |
|---|---|
| `clearNativeInput` | Clears an input through the native value setter and a bubbling `input` event, so controlled and uncontrolled consumers both observe it, then returns focus to it. |
| `subscribeDocumentEvent` | Subscribes to a document event via one shared listener per type; returns an unsubscribe fn. |
| `subscribeMediaQuery` | Subscribes to a media query via one shared `MediaQueryList` and `change` listener per query string; returns an unsubscribe fn. |
| `matchesMediaQuery` | Whether a media query currently matches, read from the shared `MediaQueryList` when registered (client only). |
| `isNativeContextMenuRequest` | Whether a `contextmenu` event asks for the browser's native menu (Ctrl + secondary-button click) instead of a custom one. |

## Keyboard navigation

| Export | Summary |
|---|---|
| `FOCUSABLE_SELECTOR` | Selector for the descendants in the tab order: links with an `href`, enabled form controls, and any element whose `tabindex` is not `-1`. |
| `nextIndexForKey` | Next roving index for a key press (1D or 2D grid), or `null` if unhandled; wraps at both ends. |
| `crossAxisDelta` | Cross-axis arrow delta for an orientation: the pair the main axis doesn't use. |
| `wrap` | Wraps an index into `[0, count)`, so a step past either end lands at the other. |
| `NavigationConfig` *(type)* | Navigation mode for `nextIndexForKey`: 2D grid when `cols` set, else single-axis along `orientation`. |

## Collections & data

| Export | Summary |
|---|---|
| `memoWeak` | The value under a key in a `WeakMap`, computed and stored on the first read — the one get-or-compute step every per-object memo spells. |
| `toggleItem` | Returns a copy of `set` with `item` toggled (removed if present, added otherwise); no mutation. |
| `keyByOccurrence` | Pairs each string with a React-key-safe id, suffixing repeats by occurrence index. |
| `rangeKeys` | Builds `count` stable `${prefix}-${index}` keys for fixed-length placeholder loops (skeletons). |
| `isDataColumn` | True for content columns; false for the selection-checkbox and row-actions columns. |
| `noop` | No-op function. |
| `once` | Wraps a thunk so it computes at most once; a later call returns the cached first result. This is the lazy seam behind a deferred derivation like the charts' readout. |

---

**See also:** [`CORE.md`](CORE.md) · [`HOOKS.md`](HOOKS.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
