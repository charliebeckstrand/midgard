import {
	columnFacetingFeature,
	constructTable,
	createFacetedRowModel,
	createFacetedUniqueValues,
	createFilteredRowModel,
	createGroupedRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	type FilterFn,
	filterFn_includesString,
	type PaginationState,
	type Row,
	type RowData,
	type Table,
	tableFeatures,
} from '@tanstack/react-table'
import { storeReactivityBindings } from '@tanstack/table-core/store-reactivity-bindings'
import type {
	GridColumn,
	GridColumnFilterState,
	GridPagination,
	GridSortState,
} from '../../modules/grid'
import type { GridGroup, GridLeaf } from '../../modules/grid/engine/grid-group/tree'
import { isManualPagination } from '../../modules/grid/engine/grid-pagination-utilities'
import { type EngineData, gridFeatures } from '../../modules/grid/engine/grid-table/features'
import {
	filterOptions,
	groupingOptions,
	paginationOptions,
	sortOptions,
	toColumnDef,
	toSortingState,
} from '../../modules/grid/engine/grid-table/options'

/**
 * The features of the reference table: the features of the grid, with the
 * stock row models of TanStack Table added. The grid builds no row model, so
 * the parity tests compare its rows with the rows of these models.
 */
const referenceFeatures = tableFeatures({
	...gridFeatures,
	columnFacetingFeature,
	filteredRowModel: createFilteredRowModel(),
	facetedRowModel: createFacetedRowModel(),
	facetedUniqueValues: createFacetedUniqueValues(),
	groupedRowModel: createGroupedRowModel(),
	sortedRowModel: createSortedRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	filterFns: { includesString: filterFn_includesString },
	// Outside React, the engine takes its reactivity from TanStack Store. In the
	// grid, `useTable` adds this feature.
	coreReactivityFeature: storeReactivityBindings(),
})

type ReferenceFeatures = typeof referenceFeatures

/** A reference table over rows of type `T`. */
export type ReferenceTable<T> = Table<ReferenceFeatures, EngineData<T>>

/** A row of a {@link ReferenceTable}. */
export type ReferenceRow<T> = Row<ReferenceFeatures, EngineData<T>>

/** The global filter of a search that only marks its matches: it keeps every row. */
const passThrough: FilterFn<ReferenceFeatures, RowData> = () => true

/** The client transforms of a reference table. Each one that is absent is off. */
export type EngineTransforms = {
	query?: string
	/** Whether the quick search only marks its matches, and prunes no row. */
	highlight?: boolean
	filters?: GridColumnFilterState[]
	sort?: GridSortState[]
	/** The page, and the pagination binding of the grid. */
	page?: { state: PaginationState; config: GridPagination }
	/** The grouped column. */
	grouping?: string
}

/**
 * A stock engine table over `rows`, with the stock row models of TanStack
 * Table and the options that the grid gives the engine. The parity tests
 * compare the rows that the grid computes with the rows of this table.
 *
 * @remarks
 * Each transform that is absent turns its row model off with its `manual*`
 * option, so the model passes the rows of the stage before it through.
 */
export function engineTable<T>(
	rows: T[],
	columns: GridColumn<T>[],
	getKey: (row: T, index: number) => string | number,
	transforms: EngineTransforms,
): ReferenceTable<T> {
	const { query, filters, sort, page, grouping } = transforms

	const filtered = query !== undefined || filters !== undefined

	const manualPage = page === undefined || isManualPagination(page.config)

	return constructTable<ReferenceFeatures, EngineData<T>>({
		features: referenceFeatures,
		data: rows as EngineData<T>[],
		columns: columns.map((col) => toColumnDef(col)) as never,
		getRowId: (row, index) => String(getKey(row, index)),
		autoResetPageIndex: false,
		state: {
			...(query !== undefined ? { globalFilter: query } : {}),
			...(filters !== undefined ? { columnFilters: filters } : {}),
			...(sort !== undefined ? { sorting: toSortingState(sort) } : {}),
			...(page ? { pagination: page.state } : {}),
			...(grouping !== undefined ? { grouping: [grouping] } : {}),
		},
		...(filterOptions<T>({
			configured: filtered,
			onGlobalFilterChange: () => {},
			onColumnFiltersChange: () => {},
		}) as object),
		globalFilterFn: transforms.highlight
			? (passThrough as FilterFn<ReferenceFeatures, EngineData<T>>)
			: 'includesString',
		manualFiltering: !filtered,
		...(sortOptions<T>({ clientSort: sort !== undefined, onSortingChange: () => {} }) as object),
		manualSorting: sort === undefined,
		...(paginationOptions<T>({
			paginated: page !== undefined,
			manual: page !== undefined && isManualPagination(page.config),
			config: page?.config,
			onPaginationChange: () => {},
		}) as object),
		manualPagination: manualPage,
		...(groupingOptions<T>({
			grouped: grouping !== undefined,
			onGroupingChange: () => {},
		}) as object),
		manualGrouping: grouping === undefined,
	})
}

/**
 * The leaf rows of a reference row set: each group row expands to its leaves,
 * and any other row stays. This is how the grid read the grouped model of the
 * engine before it grouped its rows itself.
 */
export function leafRows<T>(rows: ReferenceRow<T>[]): ReferenceRow<T>[] {
	return rows.flatMap((row) => (row.getIsGrouped() ? row.getLeafRows() : [row]))
}

/**
 * The closed groups of the group rows of a reference table, in display
 * order. This is how the grid read the grouped model of the engine before it
 * grouped its rows itself.
 */
export function referenceGroups<T>(
	rows: readonly ReferenceRow<T>[],
	columnId: string,
	getKey: (row: T, index: number) => string | number,
): GridGroup<T>[] {
	return rows
		.filter((row) => row.getIsGrouped())
		.map((group) => {
			const leaves: GridLeaf<T>[] = group.subRows.map((leaf) => ({
				id: leaf.id,
				key: getKey(leaf.original, leaf.index),
				row: leaf.original,
			}))

			return {
				id: group.id,
				value: group.getGroupingValue(columnId),
				expanded: false,
				leaves,
				rows: leaves.map((leaf) => leaf.row),
			}
		})
}
