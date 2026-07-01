import type { DensityLevel } from '../../providers/density/context'

/**
 * Estimated row height (px) for virtualization when {@link GridVirtualize}
 * sets none, keyed by density — matching the `sm`/`md`/`lg` cell-padding
 * steps in `recipes/kata/table.ts` (±8px vertical padding per step) so the
 * virtualizer's estimate tracks the actually-rendered row height. @internal
 */
export const ROW_HEIGHT_BY_DENSITY = {
	compact: 36,
	snug: 44,
	loose: 52,
} satisfies Record<DensityLevel, number>

/** Rows rendered beyond the viewport on each side under virtualization, when unset. @internal */
export const DEFAULT_OVERSCAN = 10

// Stable empty-set default for omitted `hidden`/`defaultHidden`. Read-only; toggles copy it.
export const EMPTY_SET: Set<string | number> = new Set()

/** Rows per page when {@link GridPagination} omits a `defaultValue`/`value` page size. @internal */
export const DEFAULT_PAGE_SIZE = 10

/** Initial width (px) for a resizable column without a parseable `width`. @internal */
export const DEFAULT_COLUMN_SIZE = 150

/**
 * Natural width (px) the selection-checkbox column holds in the fixed (resizable)
 * layout when it sets no `width` — wide enough for the checkbox, instead of the
 * {@link DEFAULT_COLUMN_SIZE} a width-less column would otherwise take. The
 * non-resizable auto layout sizes the column to its content via `w-px`, so this
 * seeds only the fixed-layout colgroup. @internal
 */
export const SELECT_COLUMN_SIZE = 48

/** Floor (px) a resizable column can shrink to when it sets no `minWidth`. @internal */
export const DEFAULT_MIN_COLUMN_SIZE = 40

/**
 * Cap (px) on a column's auto-measured content width, so one runaway cell can't
 * starve its siblings (the autosizer holds others at their floor and overflows
 * rather than squishing). A column's own `maxWidth` overrides this — an explicit
 * ceiling is a deliberate choice. @internal
 */
export const DEFAULT_CONTENT_MAX = 480

/**
 * Text room (px) the autosizer reserves beyond a header's affordance icons for a
 * multi-word or non-string title — enough for a few characters and the ellipsis,
 * so such a header may truncate. A single-word title instead reserves its full
 * width (it never truncates); see the column measurer. @internal
 */
export const HEADER_TRUNCATE_ALLOWANCE = 24

/** Pixels a keyboard arrow nudges a column resize handle. @internal */
export const COLUMN_RESIZE_STEP = 16

/** Pixels a keyboard PageUp/PageDown jumps a column resize handle — a coarse step over the arrow nudge. @internal */
export const COLUMN_RESIZE_PAGE_STEP = 64

/** Rows a PageUp/PageDown jumps the read-only cell cursor. @internal */
export const NAV_PAGE_STEP = 10

/** Debounce (ms) before the busy live region announces a settled row count, so a fast filter/search doesn't chatter. @internal */
export const GRID_STATUS_DEBOUNCE_MS = 150
