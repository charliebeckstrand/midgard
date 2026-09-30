import type {
	ColumnDef_ColumnSizing,
	ColumnSizingState,
	columnResizingState,
} from '@tanstack/react-table'
import { getDefaultColumnSizingColumnDef } from '@tanstack/react-table/static-functions'
import { clamp } from '../../../../utilities'
import { DEFAULT_COLUMN_SIZE, DEFAULT_MIN_COLUMN_SIZE } from '../grid-constants'
import type { EngineColumn, EngineTable } from './features'

/**
 * Column-resize controls the header renders from.
 *
 * @remarks A value with actions. The widths, the bounds, and the drag are a
 * snapshot, and the grid gives a new object each time one of them changes. A
 * memoized cell can therefore read them during render. The actions write to the
 * engine, and the render code calls them only from an event.
 *
 * @internal
 */
export type GridColumnResize = {
	/** The column's width (px). */
	getSize: (id: string | number) => number
	/** The summed width (px) of the visible columns — the width of the fixed-layout table. */
	totalSize: number
	/** Whether the column can be resized (data columns only). */
	canResize: (id: string | number) => boolean
	/** The column mid drag-resize, or `null` when no pointer drag is in flight. */
	resizing: string | null
	/** Resize bounds for the column, for the separator's `aria-valuemin`/`max`. */
	bounds: (id: string | number) => { min: number; max: number }
	/** Starts a drag-resize of the column from a mouse or touch press. */
	startResize: (id: string | number, event: unknown) => void
	/** Adjust a column's width by `delta` px (keyboard), clamped to its bounds. */
	nudge: (id: string | number, delta: number) => void
	/**
	 * "Auto-size this column": sizes one column to its content and holds every
	 * other column where it sits. A `width` seed is released.
	 */
	autoSizeColumn: (id: string | number) => void
	/**
	 * "Auto-size all columns": sizes every data column to its content, as
	 * `autoSizeColumn` sizes each one, and holds them there.
	 */
	autoSizeAll: () => void
	/** "Reset column widths": gives the widths back to the grid's automatic fit, as on a fresh mount. */
	resetWidths: () => void
	/**
	 * The actions alone. The object keeps its identity across the frames of a
	 * drag, so a memoized header that takes it, and not this snapshot, holds.
	 */
	actions: GridColumnResizeActions
}

/** The actions of {@link GridColumnResize}. @internal */
export type GridColumnResizeActions = Pick<
	GridColumnResize,
	'startResize' | 'nudge' | 'autoSizeColumn' | 'autoSizeAll' | 'resetWidths'
>

/** The default size and bounds of an engine column. @internal */
const SIZING_DEFAULTS = getDefaultColumnSizingColumnDef()

/**
 * Parses a column width to px. A number passes through. A string yields a
 * number only where it is a plain `px` or unitless value. A relative or `auto`
 * width returns `undefined`, which leaves the column on content sizing.
 *
 * @internal
 */
export function parsePxWidth(width: number | string | undefined): number | undefined {
	if (width == null) return undefined

	if (typeof width === 'number') return Number.isFinite(width) ? width : undefined

	const match = /^(\d+(?:\.\d+)?)(?:px)?$/.exec(width.trim())

	return match ? Number(match[1]) : undefined
}

/**
 * A column's width (px): its sized width, else its declared size, clamped to its
 * bounds. It is the engine's `column.getSize()`, read from the sizing state that
 * the grid owns. The grid can therefore hold each width as a value.
 *
 * @param def - The engine's column definition, which carries the declared size and bounds.
 * @param sized - The column's entry in the sizing state, or `undefined`.
 * @internal
 */
export function columnWidth(def: ColumnDef_ColumnSizing, sized: number | undefined): number {
	return clamp(
		sized ?? def.size ?? SIZING_DEFAULTS.size,
		def.minSize ?? SIZING_DEFAULTS.minSize,
		def.maxSize ?? SIZING_DEFAULTS.maxSize,
	)
}

/**
 * Each column's {@link columnWidth}, by id.
 *
 * @internal
 */
export function columnWidths<T>(
	columns: readonly EngineColumn<T>[],
	sizing: ColumnSizingState,
): ReadonlyMap<string, number> {
	return new Map(
		columns.map((column) => [column.id, columnWidth(column.columnDef, sizing[column.id])]),
	)
}

/** The column mid drag-resize in the drag state, or `null`. @internal */
export function resizingColumn(resizable: boolean, info: columnResizingState): string | null {
	return resizable && info.isResizingColumn ? info.isResizingColumn : null
}

/**
 * Assembles the {@link GridColumnResize} value over the visible columns and
 * their widths. `floors` carries the autosizer's per-column hard floor, so the
 * resize `min` matches the width the header needs. A single-word header reports
 * (and can't be dragged below) its full width, and a multi-word one its icons. A
 * column the autosizer hasn't measured falls back to the engine's `minSize`.
 *
 * @internal
 */
export function buildColumnResize<T>(args: {
	/** The visible leaf columns, in render order. */
	columns: readonly EngineColumn<T>[]
	widths: ReadonlyMap<string, number>
	floors: ReadonlyMap<string, number>
	resizing: string | null
	actions: GridColumnResizeActions
}): GridColumnResize {
	const { widths, floors } = args

	const defs = new Map(args.columns.map((column) => [column.id, column.columnDef]))

	let totalSize = 0

	for (const width of widths.values()) totalSize += width

	return {
		getSize: (id) => widths.get(String(id)) ?? DEFAULT_COLUMN_SIZE,
		totalSize,
		// The engine's `getCanResize`: a column resizes unless its definition opts out.
		canResize: (id) => {
			const def = defs.get(String(id))

			return def != null && def.enableResizing !== false
		},
		resizing: args.resizing,
		bounds: (id) => resizeBounds(defs.get(String(id)), floors.get(String(id))),
		...args.actions,
		actions: args.actions,
	}
}

/** A column's resize bounds: its measured floor, else its `minSize`, up to its `maxSize`. @internal */
function resizeBounds(
	def: ColumnDef_ColumnSizing | undefined,
	floor: number | undefined,
): { min: number; max: number } {
	return {
		min: floor ?? def?.minSize ?? DEFAULT_MIN_COLUMN_SIZE,
		max: def?.maxSize ?? Number.MAX_SAFE_INTEGER,
	}
}

/**
 * The engine actions of {@link GridColumnResize}. Each reads the engine when it
 * runs, so two presses in one frame see each other's width.
 *
 * @param floors - The autosizer's live floors, read when a nudge runs.
 * @internal
 */
export function columnResizeActions<T>(
	table: EngineTable<T>,
	floors: ReadonlyMap<string, number>,
): Pick<GridColumnResizeActions, 'startResize' | 'nudge'> {
	return {
		startResize: (id, event) => {
			const header = table.getFlatHeaders().find((entry) => entry.column.id === String(id))

			if (header) withResizeDirection(table, header.getResizeHandler())(event)
		},
		nudge: (id, delta) => {
			const column = table.getColumn(String(id))

			if (!column) return

			const limit = resizeBounds(column.columnDef, floors.get(String(id)))

			const next = clamp(column.getSize() + delta, limit.min, limit.max)

			table.setColumnSizing((prev) => ({ ...prev, [String(id)]: next }))
		},
	}
}

/**
 * Wraps an engine resize handler so the drag reads the direction of the handle.
 * The engine adds the pointer delta to the width, and `columnResizeDirection:
 * 'rtl'` negates it. The trailing edge of a right-to-left header is on the
 * left, so a drag to the left must widen the column. The direction comes from
 * the computed style of the pressed element at the start of each drag. The
 * engine reads the option on each move.
 *
 * @internal
 */
function withResizeDirection<T>(
	table: EngineTable<T>,
	handler: (event: unknown) => void,
): (event: unknown) => void {
	return (event) => {
		const target = (event as { currentTarget?: unknown }).currentTarget

		const direction =
			target instanceof Element && getComputedStyle(target).direction === 'rtl' ? 'rtl' : 'ltr'

		// The updater reads the current options of the engine. The table object of
		// a past render holds the options of that render.
		table.setOptions((prev) =>
			prev.columnResizeDirection === direction
				? prev
				: { ...prev, columnResizeDirection: direction },
		)

		handler(event)
	}
}
