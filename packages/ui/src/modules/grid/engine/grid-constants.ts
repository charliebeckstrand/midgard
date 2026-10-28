/** Rows rendered beyond the viewport on each side under virtualization, when unset. @internal */
export const DEFAULT_OVERSCAN = 10

/**
 * The size (px) that a windowed body assumes for its scroller until the scroller
 * measures. A server render thus paints a first window of rows, and the browser
 * sizes the columns of the first paint from them (see `readFitLayout`). @internal
 */
export const FIRST_WINDOW_RECT = { width: 0, height: 480 }

/**
 * The row height (px) that a windowed body assumes until a row measures (see
 * `useGridRowHeight`). It sets only the count of rows in the first window. @internal
 */
export const FIRST_ROW_ESTIMATE = 40

/**
 * The selector for the grid's cursor tab stop. A client-grouped grid is a
 * `treegrid`, and every other grid with a cursor is a `grid`. @internal
 */
export const GRID_ROLE = '[role="grid"], [role="treegrid"]'

/**
 * A stable empty row set. An inactive total, and an aggregate cell with no
 * rows, hold its identity. @internal
 */
export const NO_ROWS: never[] = []

/** Stable empty-set default for omitted `hidden`/`defaultHidden`. Read-only; toggles copy it. @internal */
export const EMPTY_SET: Set<string | number> = new Set()

/** Rows per page when {@link GridPagination} omits a `defaultValue`/`value` page size. @internal */
export const DEFAULT_PAGE_SIZE = 10

/** Initial width (px) for a resizable column without a parseable `width`. @internal */
export const DEFAULT_COLUMN_SIZE = 150

/**
 * Seed width (px) the selection-checkbox column holds in the fixed (resizable)
 * layout when it sets no `width`, until the autosizer measures its content. It
 * is near the checkbox, instead of the {@link DEFAULT_COLUMN_SIZE} a width-less
 * column would otherwise take. The non-resizable auto layout sizes the column
 * to its content via `w-px`, so this seeds only the fixed-layout colgroup.
 *
 * @internal
 */
export const SELECT_COLUMN_SIZE = 48

/**
 * Seed width (px) the row drag-handle column holds in the fixed (resizable)
 * layout when it sets no `width`, until the autosizer measures its content. It
 * is near the grip, like {@link SELECT_COLUMN_SIZE} for the checkbox. The
 * non-resizable auto layout sizes it to content via `w-px`, so this seeds only
 * the fixed-layout colgroup.
 *
 * @internal
 */
export const DRAG_HANDLE_COLUMN_SIZE = 44

/**
 * Seed width (px) the row-expander column holds in the fixed (resizable)
 * layout when it sets no `width`, until the autosizer measures its content. It
 * is near the disclosure chevron, like {@link DRAG_HANDLE_COLUMN_SIZE} for the
 * grip. The non-resizable auto layout sizes it to content via `w-px`, so this
 * seeds only the fixed-layout colgroup.
 *
 * @internal
 */
export const EXPANDER_COLUMN_SIZE = 44

/**
 * Floor (px) a resizable column can shrink to when it sets no `minWidth`. The fit
 * layout states the same floor in CSS (`k.fit.floor`), so keep the two in step.
 * @internal
 */
export const DEFAULT_MIN_COLUMN_SIZE = 40

/**
 * Cap (px) on a column's auto-measured content width, so one runaway cell can't
 * starve its siblings. The autosizer holds others at their floor and overflows,
 * rather than squishing. A column's own `maxWidth` overrides this: an explicit
 * ceiling is a deliberate choice. The fit layout states the same cap in CSS
 * (`k.fit.cap`), so keep the two in step.
 *
 * @internal
 */
export const DEFAULT_CONTENT_MAX = 480

/**
 * Text room (px) the autosizer reserves beyond a header's affordance icons for
 * a multi-word or non-string title. It is enough for a few characters and the
 * ellipsis, so such a header can truncate. A single-word title instead reserves
 * its full width (it never truncates); see the column measurer.
 *
 * @internal
 */
export const HEADER_TRUNCATE_ALLOWANCE = 24

/** Pixels a keyboard arrow nudges a column resize handle. @internal */
export const COLUMN_RESIZE_STEP = 16

/** Pixels a keyboard PageUp/PageDown jumps a column resize handle: a coarse step over the arrow nudge. @internal */
export const COLUMN_RESIZE_PAGE_STEP = 64

/** Fallback rows for a PageUp/PageDown cursor jump when the viewport or row height cannot be measured. @internal */
export const NAV_PAGE_STEP = 10

/** Debounce (ms) before the live region speaks a cell range, so a held Shift+arrow speaks once when it stops. @internal */
export const GRID_RANGE_ANNOUNCE_MS = 300

/** Debounce (ms) before the busy live region announces a settled row count, so a fast filter/search doesn't chatter. @internal */
export const GRID_STATUS_DEBOUNCE_MS = 150

/**
 * Debounce (ms) the quick-search field waits after the last keystroke before
 * driving the engine's global filter. A fast typist thus settles into one
 * O(rows × columns) filter pass.
 *
 * @internal
 */
export const GRID_SEARCH_DEBOUNCE_MS = 200

/**
 * Placeholder skeleton rows shown under an expanded {@link GridGroupBy.manual}
 * group while its children load. A group opens instantly on expand, and these
 * fill it until the consumer's `onGroupExpand` fetch feeds the children back. A
 * single loading line stands in for the whole group, whatever its size (server
 * grouping exists precisely because a group can be enormous). An empty group
 * (backend `count` of 0) shows none.
 *
 * @internal
 */
export const MANUAL_GROUP_PLACEHOLDER_ROWS = 1

/**
 * Placeholder skeleton rows the grid's whole-body loading state draws (one
 * `TextSkeleton` per column). A single bar reads as "loading" without
 * pretending to a row count the data hasn't set yet. @internal
 */
export const GRID_LOADING_ROWS = 1

/**
 * Zero cell padding as an inline style: highest specificity, so it clears the
 * density padding of the `td`. Hoisted so every consumer shares one
 * object.
 *
 * @internal
 */
export const NO_PADDING = { padding: 0 } as const
