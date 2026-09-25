import { constructTable, type PaginationState } from '@tanstack/react-table'
import { storeReactivityBindings } from '@tanstack/table-core/store-reactivity-bindings'
import type {
	GridColumn,
	GridColumnFilterState,
	GridPagination,
	GridSortState,
} from '../../modules/grid'
import { isManualPagination } from '../../modules/grid/engine/grid-pagination-utilities'
import {
	type EngineData,
	type EngineTable,
	type GridFeatures,
	gridFeatures,
} from '../../modules/grid/engine/grid-table/features'
import {
	filterOptions,
	paginationOptions,
	sortOptions,
	toColumnDef,
	toSortingState,
} from '../../modules/grid/engine/grid-table/options'

/** The client transforms of a stock engine table. Each one that is absent is off. */
export type EngineTransforms = {
	query?: string
	/** Whether the quick search only marks its matches, and prunes no row. */
	highlight?: boolean
	filters?: GridColumnFilterState[]
	sort?: GridSortState[]
	/** The page, and the pagination binding of the grid. */
	page?: { state: PaginationState; config: GridPagination }
}

/**
 * A stock engine table over `rows`, with the options that the grid gives the
 * engine for each transform. The parity tests compare the rows that the grid
 * computes off the engine with the rows of this table.
 *
 * @remarks
 * Outside React, the engine takes its reactivity from TanStack Store. In the
 * grid, `useTable` adds this feature.
 */
export function engineTable<T>(
	rows: T[],
	columns: GridColumn<T>[],
	getKey: (row: T, index: number) => string | number,
	transforms: EngineTransforms,
): EngineTable<T> {
	const features = { ...gridFeatures, coreReactivityFeature: storeReactivityBindings() }

	const { query, filters, sort, page } = transforms

	const filtered = query !== undefined || filters !== undefined

	const manual = isManualPagination(page?.config)

	return constructTable({
		features: features as GridFeatures,
		data: rows as EngineData<T>[],
		columns: columns.map((col) => toColumnDef(col)),
		getRowId: (row, index) => String(getKey(row, index)),
		autoResetPageIndex: false,
		state: {
			...(query !== undefined ? { globalFilter: query } : {}),
			...(filters !== undefined ? { columnFilters: filters } : {}),
			...(sort !== undefined ? { sorting: toSortingState(sort) } : {}),
			...(page ? { pagination: page.state } : {}),
		},
		...filterOptions<T>({
			configured: filtered,
			manual: false,
			globalHighlight: transforms.highlight ?? false,
			onGlobalFilterChange: () => {},
			onColumnFiltersChange: () => {},
		}),
		...sortOptions<T>({ clientSort: sort !== undefined, onSortingChange: () => {} }),
		...paginationOptions<T>({
			paginated: page !== undefined,
			manual,
			config: page?.config,
			onPaginationChange: () => {},
		}),
		manualGrouping: true,
	})
}
