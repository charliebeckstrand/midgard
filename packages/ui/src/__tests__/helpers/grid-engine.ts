import {
	type ColumnDef,
	columnFacetingFeature,
	columnGroupingFeature,
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
	rowSortingFeature,
	type SortFn,
	type SortingState,
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
import {
	compareSortKeys,
	type SortKey,
	toSortKey,
} from '../../modules/grid/engine/grid-sort/utilities'
import { type EngineData, gridFeatures } from '../../modules/grid/engine/grid-table/features'
import {
	filterOptions,
	paginationOptions,
	toColumnDef,
} from '../../modules/grid/engine/grid-table/options'
import { getOrCompute, isDataColumn } from '../../utilities'

/**
 * The features of the reference table: the features of the grid, with the
 * sorting and grouping features and the stock row models of TanStack Table
 * added. The grid builds no row model, and it sorts and groups with its own
 * state, so the parity tests compare its rows with the rows of these models.
 */
const referenceFeatures = tableFeatures({
	...gridFeatures,
	columnFacetingFeature,
	columnGroupingFeature,
	rowSortingFeature,
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

/** Adapts the ordered sort list of the grid to the sorting state of the engine, in priority order. */
function toSortingState(sort: GridSortState[]): SortingState {
	return sort.map((entry) => ({ id: String(entry.column), desc: entry.direction === 'desc' }))
}

/**
 * The {@link SortKey} of each row, cached for each column on the row. A sort
 * compares a row O(log N) times, and the cache decodes each value once for
 * each sort. A `WeakMap` holds no row alive.
 */
const sortKeyCache = new WeakMap<Row<ReferenceFeatures, RowData>, Map<string, SortKey>>()

/** The {@link SortKey} of `row` for `columnId`, decoded on first use. */
function rowSortKey(row: Row<ReferenceFeatures, RowData>, columnId: string): SortKey {
	const perColumn = getOrCompute(sortKeyCache, row, () => new Map<string, SortKey>())

	return getOrCompute(perColumn, columnId, () => toSortKey(row.getValue(columnId)))
}

/**
 * The smart sort of a data column: it orders rows by the {@link SortKey} of
 * their accessor value, as the grid does.
 *
 * @remarks
 * The engine negates the result of a comparator for a `desc` column. The
 * comparator reads the live direction and inverts the result for an empty
 * value, so empty values go last in the two directions.
 */
const smartSortFn: SortFn<ReferenceFeatures, RowData> = (rowA, rowB, columnId) => {
	const a = rowSortKey(rowA, columnId)

	const b = rowSortKey(rowB, columnId)

	const result = compareSortKeys(a, b)

	if (!a.empty && !b.empty) return result

	const descending = rowA.table.atoms.sorting
		.get()
		.some((entry) => entry.id === columnId && entry.desc)

	return descending ? -result : result
}

/**
 * The column definition of the reference table: the definition that the grid
 * gives the engine, with the sort and group options of the column added.
 */
function referenceColumnDef<T>(col: GridColumn<T>): ColumnDef<ReferenceFeatures, EngineData<T>> {
	const { sortFn } = col

	const engineSortFn: SortFn<ReferenceFeatures, EngineData<T>> | undefined = !isDataColumn(col)
		? undefined
		: sortFn
			? (rowA, rowB) => sortFn(rowA.original, rowB.original)
			: (smartSortFn as SortFn<ReferenceFeatures, EngineData<T>>)

	return {
		...(toColumnDef(col) as ColumnDef<ReferenceFeatures, EngineData<T>>),
		enableSorting: Boolean(col.sortable),
		// Only a data column groups.
		enableGrouping: isDataColumn(col),
		// The engine sorts a literal `undefined` itself, before the sort function,
		// and its desc negation then puts it first. With this option off, the sort
		// function orders it, as the grid does.
		...(engineSortFn ? { sortFn: engineSortFn, sortUndefined: false as const } : {}),
	}
}

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
		columns: columns.map((col) => referenceColumnDef(col)),
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
		// The reference table sorts with the engine. It keeps a multi-column sort.
		...(sort !== undefined ? { onSortingChange: () => {}, enableMultiSort: true } : {}),
		manualSorting: sort === undefined,
		...(paginationOptions<T>({
			paginated: page !== undefined,
			manual: page !== undefined && isManualPagination(page.config),
			config: page?.config,
			onPaginationChange: () => {},
		}) as object),
		manualPagination: manualPage,
		...(grouping !== undefined ? { onGroupingChange: () => {} } : {}),
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
				key: group.id.slice(columnId.length + 1),
				expanded: false,
				leaves,
				rows: leaves.map((leaf) => leaf.row),
			}
		})
}
