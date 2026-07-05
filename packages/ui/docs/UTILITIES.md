# Utilities

> **Quick-glance index of `src/utilities/`.** Small, dependency-free pure helpers shared across the package — numeric clamping/formatting, caret bookkeeping for formatted inputs, the Escape dismiss-layer stack, a shared document-event subscriber, and roving keyboard-navigation math. **Internal:** `utilities` is not a `package.json` export; reach it by relative import within the package (`from '../../utilities'`), not as `ui/utilities`.

## Numeric

| Export | Summary |
|---|---|
| `clamp` | Constrains `value` to the inclusive range `[lo, hi]`. |
| `pct` | Maps `value` to its percentage position within `[min, max]`; `0` when the range is empty. |
| `digitsOnly` | Returns `value` with every non-digit character removed. |
| `formatInteger` | Locale-formats `value` with no fraction digits (cached formatter). |
| `formatFraction` | Locale-formats `value` with up to two fraction digits (cached formatter). |
| `formatPercent` | Locale-formats a `0..1` share as a whole percent (cached formatter). |
| `resolveFormat` | Resolves a `FormatSpec` to a cached `(value) => string` formatter — number, integer, currency, percent, compact, or prefixed id. |
| `FormatSpec` *(type)* | What to format a value as: a numeric `Intl` format (`number`/`integer`/`currency`/`percent`/`compact`) or a prefixed `id`. |

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
| `subscribeDocumentEvent` | Subscribes to a document event via one shared listener per type; returns an unsubscribe fn. |

## Keyboard navigation

| Export | Summary |
|---|---|
| `nextIndexForKey` | Next roving index for a key press (1D or 2D grid), or `null` if unhandled; wraps at both ends. |
| `crossAxisDelta` | Cross-axis arrow delta for an orientation: the pair the main axis doesn't use. |
| `NavigationConfig` *(type)* | Navigation mode for `nextIndexForKey`: 2D grid when `cols` set, else single-axis along `orientation`. |

## Collections & data

| Export | Summary |
|---|---|
| `toggleItem` | Returns a copy of `set` with `item` toggled (removed if present, added otherwise); no mutation. |
| `keyByOccurrence` | Pairs each string with a React-key-safe id, suffixing repeats by occurrence index. |
| `rangeKeys` | Builds `count` stable `${prefix}-${index}` keys for fixed-length placeholder loops (skeletons). |
| `isDataColumn` | True for content columns; false for the selection-checkbox and row-actions columns. |
| `noop` | No-op function. |

---

**See also:** [`CORE.md`](CORE.md) · [`HOOKS.md`](HOOKS.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
