export const DEFAULT_ROW_HEIGHT = 44
export const DEFAULT_OVERSCAN = 10

// Stable empty-set default for omitted `hidden`/`defaultHidden`. Read-only; toggles copy it.
export const EMPTY_SET: Set<string | number> = new Set()

/** Rows per page when {@link GridPagination} omits a `defaultValue`/`value` page size. @internal */
export const DEFAULT_PAGE_SIZE = 10

/** Initial width (px) for a resizable column without a parseable `width`. @internal */
export const DEFAULT_COLUMN_SIZE = 150

/** Floor (px) a resizable column can shrink to when it sets no `minWidth`. @internal */
export const DEFAULT_MIN_COLUMN_SIZE = 40

/** Pixels a keyboard arrow nudges a column resize handle. @internal */
export const COLUMN_RESIZE_STEP = 16

/** Rows a PageUp/PageDown jumps the read-only cell cursor. @internal */
export const NAV_PAGE_STEP = 10
