import type {
	ColumnFiltersState,
	ColumnVisibilityState,
	columnResizingState,
	GroupingState,
	PaginationState,
} from '@tanstack/react-table'
import type { GridColumnFilterState, GridColumnSizingState, GridPaginationState } from '../../types'
import { DEFAULT_PAGE_SIZE } from '../grid-constants'
import type { EngineRow } from './features'
import { resolveFilterMode, usesClientModel } from './options'

/** First page at the default size; the fallback when no `value`/`defaultValue` page is bound. @internal */
export const DEFAULT_PAGINATION_STATE: GridPaginationState = {
	pageIndex: 0,
	pageSize: DEFAULT_PAGE_SIZE,
}

/** Stable empty sizing default; read-only, replaced wholesale on change. @internal */
export const EMPTY_SIZING: GridColumnSizingState = {}

/** The engine's drag state with no drag in flight; read-only, replaced wholesale on change. @internal */
export const IDLE_SIZING_INFO: columnResizingState = {
	startOffset: null,
	startSize: null,
	deltaOffset: null,
	deltaPercentage: null,
	isResizingColumn: false,
	columnSizingStart: [],
}

/** Stable empty column-filters default; read-only, replaced wholesale on change. Typed as the public row, which the engine's own `ColumnFiltersState` accepts. @internal */
export const EMPTY_COLUMN_FILTERS: GridColumnFilterState[] = []

/** Stable empty column-order default (engine reads definition order); read-only. @internal */
export const EMPTY_COLUMN_ORDER: (string | number)[] = []

/** Stable empty column-visibility default (all visible); read-only. @internal */
export const EMPTY_VISIBILITY: ColumnVisibilityState = {}

/** Stable empty grouping default (ungrouped); read-only. @internal */
export const EMPTY_GROUPING: GroupingState = []

/** Search-input placeholder when {@link GridSearch} supplies none. @internal */
export const DEFAULT_SEARCH_PLACEHOLDER = 'Search'

/**
 * Collapses a row set to its flat leaf set — the data rows, whatever the
 * grouping mode. Client grouping leaves group headers among only the expanded
 * leaves, so each header expands to its full leaf set regardless of expansion.
 * Manual grouping keeps the engine ungrouped and hands its headers through as
 * ordinary rows, so those drop by predicate. Ungrouped rows are already the
 * leaves, and `null` passes through.
 *
 * @param rows - The engine rows to collapse.
 * @param grouped - Whether client grouping is active.
 * @param manualGroupRow - Identifies a consumer-supplied header row under manual
 * grouping; absent or `null` otherwise. Wins outright — `grouped` is not
 * consulted under it, since manual grouping keeps the engine ungrouped.
 * @internal
 */
export function deriveLeafRows<T>(
	rows: EngineRow<T>[] | null,
	grouped: boolean,
	manualGroupRow?: ((row: T) => boolean) | null,
): EngineRow<T>[] | null {
	if (!rows) return null

	if (manualGroupRow) return rows.filter((row) => !manualGroupRow(row.original))

	if (!grouped) return rows

	return rows.flatMap((row) => (row.getIsGrouped() ? row.getLeafRows() : [row]))
}

/**
 * Resolves the engine's sort and filter transform modes. Manual grouping forces
 * both manual. The supplied rows are a positional header/children sequence, and
 * a client reorder or prune would tear children from their group headers. Kept
 * out of {@link useGridTable} for its cognitive-complexity budget.
 *
 * @internal
 */
export function resolveTransformModes(args: {
	manualGrouped: boolean
	sortManual: boolean
	globalConfigured: boolean
	hasColumnFilters: boolean
	globalManual: boolean | undefined
	columnManual: boolean | undefined
	/** The search's `filter` flag; `false` puts the global search in highlight (mark, don't prune) mode. */
	globalFiltersRows: boolean | undefined
}): {
	clientSort: boolean
	filterMode: { configured: boolean; manual: boolean }
	/** Whether the global search marks matches instead of pruning rows (`search.mode === 'highlight'`). */
	globalHighlights: boolean
} {
	return {
		clientSort: !args.sortManual && !args.manualGrouped,
		filterMode: resolveFilterMode({
			globalConfigured: args.globalConfigured,
			hasColumnFilters: args.hasColumnFilters,
			globalManual: args.manualGrouped || args.globalManual,
			columnManual: args.manualGrouped || args.columnManual,
		}),
		globalHighlights: args.globalConfigured && args.globalFiltersRows === false,
	}
}

/** Fingerprint of the rendered rows — count and end keys — the autosizer re-measures on. @internal */
export function rowsSignatureOf(rowKeys: (string | number)[]): string {
	return `${rowKeys.length}:${rowKeys[0] ?? ''}:${rowKeys.at(-1) ?? ''}`
}

/**
 * Whether a client transform is *actively* reshaping the rows, deciding
 * whether the engine row model materializes. Capability is not activity: an
 * empty sort list, a configured search with no query, and a filter surface
 * with no entries all transform nothing. Kept out of {@link useGridTable} for
 * its cognitive-complexity budget.
 *
 * @internal
 */
export function resolveActiveEngineTransform(args: {
	paginated: boolean
	paginationManual: boolean
	filterMode: { configured: boolean; manual: boolean }
	globalFilter: string
	/** Highlight mode: the search marks rather than prunes, so its query reshapes no rows and never forces the model. */
	globalHighlights: boolean
	columnFilters: ColumnFiltersState
	grouped: boolean
}): boolean {
	const filtering =
		(!args.globalHighlights && args.globalFilter !== '') || args.columnFilters.length > 0

	return usesClientModel({
		paginated: args.paginated,
		paginationManual: args.paginationManual,
		filtersConfigured: args.filterMode.configured && filtering,
		filtersManual: args.filterMode.manual,
		// Sort is handled by the off-engine fast path (`useClientView`), so it never
		// forces the engine model on its own — only a filter, client pagination,
		// or grouping does.
		sortClient: false,
		grouped: args.grouped,
	})
}

/**
 * Where the client row transforms of a grid run: the filters, the sort, the
 * pagination, and the grouping.
 *
 * @remarks
 * The grid runs them itself (see `useClientView` and `groupRows`), and builds
 * no engine row for each datum. The engine runs them inside its pipeline in
 * one case: an applied filter that only the engine can apply.
 *
 * @returns `offEngine`: whether the grid runs the transforms itself.
 * `filtered`: whether it also applies the client filters, which it does when
 * the quick search prunes rows or a column filter is applied. `page`: the page
 * that the grid slices, which is `null` unless the grid paginates on the
 * client.
 * @internal
 */
export function resolveClientView(args: {
	paginated: boolean
	paginationManual: boolean
	pagination: PaginationState
	filterMode: { configured: boolean; manual: boolean }
	/** Whether the grid has a quick search. */
	globalFiltered: boolean
	globalFilter: string
	globalHighlights: boolean
	columnFilters: ColumnFiltersState
	/** Whether the grid can apply each column filter itself (see `compileColumnFilters`). */
	columnFiltersCompile: boolean
}): { offEngine: boolean; filtered: boolean; page: PaginationState | null } {
	const clientFilters = args.filterMode.configured && !args.filterMode.manual

	const searching =
		clientFilters && args.globalFiltered && !args.globalHighlights && args.globalFilter !== ''

	const filtering = clientFilters && args.columnFilters.length > 0

	const offEngine = !(filtering && !args.columnFiltersCompile)

	return {
		offEngine,
		filtered: offEngine && (searching || filtering),
		page: offEngine && args.paginated && !args.paginationManual ? args.pagination : null,
	}
}
