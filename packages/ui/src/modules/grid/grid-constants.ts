export const DEFAULT_ROW_HEIGHT = 44
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

/** Pixels a keyboard arrow nudges a column resize handle. @internal */
export const COLUMN_RESIZE_STEP = 16

/**
 * Trailing gutter (px) the auto-fit leaves to the right of the last data column
 * so its resize handle stays in view. The handle straddles the column's trailing
 * edge, overhanging it by half its width (`k.resize.handle` is `w-6` pulled
 * `translate-x-1/2`, so 12px); filling the container exactly would push that
 * overhang past the scroll edge and clip it. @internal
 */
export const COLUMN_RESIZE_HANDLE_OVERHANG = 12

/** Rows a PageUp/PageDown jumps the read-only cell cursor. @internal */
export const NAV_PAGE_STEP = 10
