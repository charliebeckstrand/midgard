import type {
	ColumnFiltersState,
	ColumnVisibilityState,
	columnResizingState,
	GroupingState,
	PaginationState,
} from '@tanstack/react-table'
import type { GridColumnFilterState, GridColumnSizingState, GridPaginationState } from '../../types'
import { DEFAULT_PAGE_SIZE } from '../grid-constants'
import { resolveFilterMode } from './options'

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
 * Which client row transforms the grid runs itself (see `useClientView`): the
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
