import type { ColumnFiltersState, GroupingState, Row, VisibilityState } from '@tanstack/react-table'
import type { GridColumnSizingState, GridPaginationState } from '../../types'
import { DEFAULT_PAGE_SIZE } from '../grid-constants'
import { resolveFilterMode, usesClientModel } from './options'

/** First page at the default size; the fallback when no `value`/`defaultValue` page is bound. @internal */
export const DEFAULT_PAGINATION_STATE: GridPaginationState = {
	pageIndex: 0,
	pageSize: DEFAULT_PAGE_SIZE,
}

/** Stable empty sizing default; read-only, replaced wholesale on change. @internal */
export const EMPTY_SIZING: GridColumnSizingState = {}

/** Stable empty column-filters default; read-only, replaced wholesale on change. @internal */
export const EMPTY_COLUMN_FILTERS: ColumnFiltersState = []

/** Stable empty column-order default (engine reads definition order); read-only. @internal */
export const EMPTY_COLUMN_ORDER: (string | number)[] = []

/** Stable empty column-visibility default (all visible); read-only. @internal */
export const EMPTY_VISIBILITY: VisibilityState = {}

/** Stable empty grouping default (ungrouped); read-only. @internal */
export const EMPTY_GROUPING: GroupingState = []

/** Search-input placeholder when {@link GridSearch} supplies none. @internal */
export const DEFAULT_SEARCH_PLACEHOLDER = 'Search'

/**
 * Collapses a row set to its flat leaf set — the data rows, whatever the
 * grouping mode. Client grouping leaves group headers among only the expanded
 * leaves, so each header expands to its full leaf set regardless of expansion;
 * manual grouping keeps the engine ungrouped and hands its headers through as
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
	rows: Row<T>[] | null,
	grouped: boolean,
	manualGroupRow?: ((row: T) => boolean) | null,
): Row<T>[] | null {
	if (!rows) return null

	if (manualGroupRow) return rows.filter((row) => !manualGroupRow(row.original))

	if (!grouped) return rows

	return rows.flatMap((row) => (row.getIsGrouped() ? row.getLeafRows() : [row]))
}

/**
 * Resolves the engine's sort and filter transform modes. Manual grouping forces
 * both manual: the supplied rows are a positional header/children sequence, and
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
	/** Whether the global search marks matches instead of pruning rows (`search.filter === false`). */
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
		// Sort is handled by the off-engine fast path (`useSortView`), so it never
		// forces the engine model on its own — only a filter, client pagination,
		// or grouping does.
		sortClient: false,
		grouped: args.grouped,
	})
}
