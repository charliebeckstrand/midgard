import {
	type Column,
	type ColumnDef,
	columnOrderingFeature,
	columnPinningFeature,
	columnResizingFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	type RowData,
	type Table,
	type TableOptions,
	tableFeatures,
} from '@tanstack/react-table'

/**
 * The engine features of the grid.
 *
 * @remarks
 * The engine holds the state of the columns: order, visibility, pinning,
 * sizing, and the drag of a resize. It resolves the visible columns from that
 * state, and it runs the pointer gesture of a resize. The grid filters, sorts,
 * groups, and pages its rows itself, with its own state (see
 * `useGridClientView` and `useGroupTree`). The engine therefore has no row
 * feature and no row-model factory. The reference table of the parity tests
 * adds them (see `helpers/grid-engine.ts`).
 *
 * @internal
 */
export const gridFeatures = tableFeatures({
	columnOrderingFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnResizingFeature,
	columnVisibilityFeature,
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
