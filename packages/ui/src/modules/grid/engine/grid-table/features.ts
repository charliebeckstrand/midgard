import {
	type Column,
	type ColumnDef,
	columnFacetingFeature,
	columnFilteringFeature,
	columnGroupingFeature,
	columnOrderingFeature,
	columnPinningFeature,
	columnResizingFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createFacetedRowModel,
	createFacetedUniqueValues,
	createFilteredRowModel,
	createGroupedRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	filterFn_includesString,
	globalFilteringFeature,
	type Row,
	type RowData,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
	type Table,
	type TableOptions,
	tableFeatures,
} from '@tanstack/react-table'
import type { GridColumn } from '../../types'

/**
 * The engine features of the grid, and the row models that they use.
 *
 * @remarks
 * The engine reads its features one time, when it builds the table. A grid
 * therefore cannot add or remove a row model between renders. Each row model
 * stays registered, and the grid turns a transform off with its `manual*`
 * option (see `options.ts`). The engine then passes the rows of the previous
 * stage through.
 *
 * The engine gets no expanding feature. The grid opens its groups itself, so
 * the display rows under grouping are the group rows alone.
 *
 * @internal
 */
export const gridFeatures = tableFeatures({
	columnFacetingFeature,
	columnFilteringFeature,
	globalFilteringFeature,
	columnGroupingFeature,
	columnOrderingFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnResizingFeature,
	columnVisibilityFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
	filteredRowModel: createFilteredRowModel(),
	facetedRowModel: createFacetedRowModel(),
	facetedUniqueValues: createFacetedUniqueValues(),
	groupedRowModel: createGroupedRowModel(),
	sortedRowModel: createSortedRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	filterFns: { includesString: filterFn_includesString },
	// Carries the source column on each column definition, so the visible
	// columns of the engine map back to the columns of the grid (see
	// `toGridColumns`). The value is a phantom; only its type is used.
	// biome-ignore lint/suspicious/noExplicitAny: the meta holds a column of any row type.
	columnMeta: {} as { gridColumn: GridColumn<any> },
})

/** The feature set of the grid engine. @internal */
export type GridFeatures = typeof gridFeatures

/**
 * A grid row type as the engine sees it. The engine limits row data to a
 * record or an array, and the grid takes any row type, so the engine types
 * use this intersection.
 *
 * @internal
 */
export type EngineData<T> = T & RowData

/** The engine table of a grid. @internal */
export type EngineTable<T> = Table<GridFeatures, EngineData<T>>

/** An engine row of a grid. @internal */
export type EngineRow<T> = Row<GridFeatures, EngineData<T>>

/** An engine column of a grid. @internal */
export type EngineColumn<T> = Column<GridFeatures, EngineData<T>, unknown>

/** An engine column definition of a grid. @internal */
export type EngineColumnDef<T> = ColumnDef<GridFeatures, EngineData<T>>

/** The engine options of a grid. @internal */
export type EngineOptions<T> = TableOptions<GridFeatures, EngineData<T>>
