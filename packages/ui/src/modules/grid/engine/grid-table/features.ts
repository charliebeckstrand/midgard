import {
	type Column,
	type ColumnDef,
	columnFilteringFeature,
	columnOrderingFeature,
	columnPinningFeature,
	columnResizingFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	globalFilteringFeature,
	type RowData,
	rowPaginationFeature,
	type Table,
	type TableOptions,
	tableFeatures,
} from '@tanstack/react-table'

/**
 * The engine features of the grid.
 *
 * @remarks
 * The engine holds the state of the columns and of the row transforms, and
 * the actions that write that state. It builds no row model. The grid filters,
 * sorts, groups, and pages its rows itself (see `useGridClientView` and
 * `groupRows`). The engine therefore gets no row-model factory, and makes no
 * row object for each datum.
 *
 * The grid sorts and groups with its own state (see `useGridSort` and
 * `useGroupTree`), so the engine has no sorting or grouping feature. The
 * reference table of the parity tests adds them (see `helpers/grid-engine.ts`).
 *
 * @internal
 */
export const gridFeatures = tableFeatures({
	columnFilteringFeature,
	globalFilteringFeature,
	columnOrderingFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnResizingFeature,
	columnVisibilityFeature,
	rowPaginationFeature,
	// Carries the source column on each column definition, so the visible
	// columns of the engine map back to the columns of the grid (see
	// `toGridColumns`). The value is a phantom; only its type is used. The slot
	// takes no row type, so the column is `unknown` here.
	columnMeta: {} as { gridColumn: unknown },
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

/** An engine column of a grid. @internal */
export type EngineColumn<T> = Column<GridFeatures, EngineData<T>, unknown>

/** An engine column definition of a grid. @internal */
export type EngineColumnDef<T> = ColumnDef<GridFeatures, EngineData<T>>

/** The engine options of a grid. @internal */
export type EngineOptions<T> = TableOptions<GridFeatures, EngineData<T>>
