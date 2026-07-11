import type {
	ColumnFiltersState,
	GroupingState,
	Row,
	Updater,
	VisibilityState,
} from '@tanstack/react-table'
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

/** Resolves a TanStack `Updater<S>` against a base value. @internal */
export function applyUpdater<S>(updater: Updater<S>, base: S): S {
	return typeof updater === 'function' ? (updater as (prev: S) => S)(base) : updater
}

/**
 * Collapses the engine's display rows to their flat leaf set. Under grouping the
 * display rows carry group headers and only the expanded leaves, so each group
 * expands to its full leaf set (whatever its expansion) to recover every data
 * row; ungrouped display rows are already the leaves, and `null` passes through.
 *
 * @internal
 */
export function deriveLeafRows<T>(displayRows: Row<T>[] | null, grouped: boolean): Row<T>[] | null {
	if (!displayRows) return null

	if (!grouped) return displayRows

	return displayRows.flatMap((row) => (row.getIsGrouped() ? row.getLeafRows() : [row]))
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
}): { clientSort: boolean; filterMode: { configured: boolean; manual: boolean } } {
	return {
		clientSort: !args.sortManual && !args.manualGrouped,
		filterMode: resolveFilterMode({
			globalConfigured: args.globalConfigured,
			hasColumnFilters: args.hasColumnFilters,
			globalManual: args.manualGrouped || args.globalManual,
			columnManual: args.manualGrouped || args.columnManual,
		}),
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
	columnFilters: ColumnFiltersState
	grouped: boolean
}): boolean {
	const filtering = args.globalFilter !== '' || args.columnFilters.length > 0

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
