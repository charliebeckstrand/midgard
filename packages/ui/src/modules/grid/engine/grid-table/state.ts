import type {
	ColumnFiltersState,
	ColumnVisibilityState,
	columnResizingState,
	GroupingState,
	PaginationState,
} from '@tanstack/react-table'
import type { GridColumnFilterState, GridColumnSizingState, GridPaginationState } from '../../types'
import { DEFAULT_PAGE_SIZE } from '../grid-constants'
import { resolveFilterMode } from './filter-view'

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
	/** Whether the global search prunes rows. It is `false` when `search.mode` is `'highlight'`, which marks the matches and keeps every row. */
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

/** The 32-bit FNV-1a hash of a row key's string form. @internal */
function hashKey(key: string | number): number {
	const text = String(key)

	let hash = 0x811c9dc5

	for (let i = 0; i < text.length; i++) {
		hash ^= text.charCodeAt(i)

		hash = Math.imul(hash, 0x01000193)
	}

	return hash >>> 0
}

/**
 * Fingerprint of the rendered rows that the autosizer re-measures on: the count,
 * and two hashes of the set of keys.
 *
 * The hashes combine each key's hash by a sum and by an exclusive or, so the order
 * of the keys does not change them. A sort shows the same rows in a new order, and
 * the widest cell of each column stays the same, so a sort keeps the fingerprint and
 * measures nothing. A page turn, a filter, or new data changes the set of keys, and
 * so the fingerprint.
 *
 * @internal
 */
export function rowsSignatureOf(rowKeys: readonly (string | number)[]): string {
	let sum = 0

	let mix = 0

	for (const key of rowKeys) {
		const hash = hashKey(key)

		sum = (sum + hash) >>> 0

		mix = (mix ^ hash) >>> 0
	}

	return `${rowKeys.length}:${sum}:${mix}`
}

/**
 * Which client row transforms the grid runs itself (see `useGridClientView`): the
 * client filters and the client page.
 *
 * @returns `filtered`: whether the grid applies the client filters, which it
 * does when the quick search prunes rows or a column filter is applied.
 * `page`: the page that the grid slices, which is `null` unless the grid
 * paginates on the client.
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
}): { filtered: boolean; page: PaginationState | null } {
	const clientFilters = args.filterMode.configured && !args.filterMode.manual

	const searching =
		clientFilters && args.globalFiltered && !args.globalHighlights && args.globalFilter !== ''

	const filtering = clientFilters && args.columnFilters.length > 0

	return {
		filtered: searching || filtering,
		page: args.paginated && !args.paginationManual ? args.pagination : null,
	}
}
