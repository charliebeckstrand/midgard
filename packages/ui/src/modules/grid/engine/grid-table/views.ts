import {
	type ColumnDef_ColumnSizing,
	type ColumnPinningState,
	type ColumnSizingState,
	functionalUpdate,
	type PaginationState,
} from '@tanstack/react-table'
import { getDefaultColumnSizingColumnDef } from '@tanstack/react-table/static-functions'
import type { SetStateAction } from 'react'
import { clamp } from '../../../../utilities'
import { isQueryActive } from '../../../query/engine/query-active'
import { isQueryGroup } from '../../../query/engine/query-node'
import type { QueryGroup } from '../../../query/engine/types'
import type { GridColumn, GridColumnFilterState, GridPagination } from '../../types'
import { DEFAULT_COLUMN_SIZE, DEFAULT_MIN_COLUMN_SIZE } from '../grid-constants'
import { isNewRowAddColumn } from '../grid-new-row-column'
import type { FrozenColumn, FrozenLayout } from '../grid-pin/layout'
import { frozenSide } from '../grid-pin/overrides'
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

/**
 * Frozen-column controls: one lookup from a column id to the chrome it draws.
 *
 * @remarks It reads a resolved {@link FrozenLayout} snapshot. The pinned
 * chrome rides `memo` boundaries, so a cell that holds on its props sees a
 * frozen-layout change only through this object's identity.
 *
 * @internal
 */
export type GridColumnPinning = {
	/** The column's frozen chrome — edge, sticky offset, and boundary — or `undefined` when it scrolls. */
	column: (id: string | number) => FrozenColumn | undefined
}

/**
 * The faceted values of a column: the values its cells hold in the rows that the
 * other filters leave.
 *
 * @internal
 */
export type GridColumnFacets = {
	/**
	 * The distinct cell values, sorted and de-duplicated — what a `select` filter
	 * offers when it declares no explicit `filterOptions`. Empty under
	 * server-side (manual) filtering or for a column without a value accessor.
	 */
	values: string[]
	/**
	 * The `[min, max]` of the numeric cell values, or `undefined` when there is
	 * none. A `number` filter's `between` editor clamps to it. It is `undefined`
	 * under server-side (manual) filtering, as `values` is empty there.
	 */
	span: readonly [number, number] | undefined
}

/**
 * Per-column filter controls the header filter sheets render from.
 *
 * @remarks A value with actions. The applied queries, the affordance, and the
 * open-request are a snapshot, and the grid gives a new object each time one
 * of them changes. The actions read or write the engine, so the render code
 * calls them only from an event or an effect.
 *
 * @internal
 */
export type GridColumnFilter = {
	/** Whether the column accepts a filter (declared `filterable` with a `value`). */
	canFilter: (id: string | number) => boolean
	/** Current query tree for the column, or `undefined` when unfiltered. */
	getQuery: (id: string | number) => QueryGroup | undefined
	/**
	 * Whether any column carries a filter that actually constrains rows. It is the
	 * same row-constraining test the header buttons read for their active accent
	 * (a real value or a value-less operator, not a merely-seeded rule). Drives the
	 * toolbar's "Clear filters" affordance.
	 */
	active: boolean
	/** Set (or, with `undefined`, clear) the column's query tree. */
	setQuery: (id: string | number, query: QueryGroup | undefined) => void
	/** Lift every column's applied filter at once, recovering all hidden rows. */
	clear: () => void
	/**
	 * Reads the column's {@link GridColumnFacets} from the engine. The facets
	 * change with the rows and the other filters, so a sheet reads them when it
	 * opens.
	 */
	facets: (id: string | number) => GridColumnFacets
	/**
	 * How a filterable column surfaces its filter. `'header'` (default) shows the
	 * funnel button in every filterable column header. `'menu'` drops the resting
	 * funnel, reclaiming the header width, and offers the filter from the column's
	 * right-click menu instead. The funnel returns only once a filter is applied,
	 * as the edit/clear affordance.
	 */
	affordance: 'header' | 'menu'
	/** The column whose filter sheet was asked to open (from the menu), or `null`. */
	openColumn: string | number | null
	/** Ask a column's filter sheet to open (or clear the request with `null`). */
	requestOpen: (id: string | number | null) => void
}

/** The actions of {@link GridColumnFilter} that reach the engine. @internal */
export type GridColumnFilterActions = Pick<GridColumnFilter, 'setQuery' | 'clear' | 'facets'>

/**
 * Resolved pagination view model the footer renders from — page coordinate,
 * derived totals and bounds, and the navigation setters that drive the engine.
 *
 * @internal
 */
export type GridPaginationView = {
	pageIndex: number
	pageSize: number
	/** Total pages, or `-1` when unknown (server mode with no `rowCount`/`pageCount`). */
	pageCount: number
	/** Total rows across pages when known: `rowCount` in server mode, the filtered count in client mode. */
	rowCount: number | undefined
	/** 1-based index of the first row shown on the page; `0` when the page is empty. */
	from: number
	/** 1-based index of the last row shown on the page; `0` when the page is empty. */
	to: number
	canPrevious: boolean
	canNext: boolean
	pageSizeOptions: number[] | undefined
	/**
	 * Moves to a page, by absolute index or by an updater the engine applies to the
	 * live index. Two navigations that land on one render compose under an updater;
	 * an absolute index computed from the rendered page resolves both to the same
	 * page. The result stays inside a known page count. The engine bounds it only
	 * against an explicit `pageCount`, which client mode never sets, so the view
	 * clamps it.
	 */
	setPageIndex: (index: SetStateAction<number>) => void
	setPageSize: (size: number) => void
}

/** Global-filter view the search input renders from. @internal */
export type GridGlobalFilterView = {
	value: string
	setValue: (value: string) => void
	placeholder: string
}

/**
 * Derives the engine's `columnPinning` state from each column's effective frozen
 * edge, plus whether any column is frozen at all. That edge is
 * {@link frozenSide}: its `locked` side, else its `pinned` side, `true` being
 * left. The left edge goes in the `start` section of the engine, and the right
 * edge goes in the `end` section.
 *
 * @remarks The selection column always leads the left edge, ahead of every
 * left-frozen data column. The row checkboxes therefore stay anchored to the
 * far left while the grid scrolls sideways. It is held out of the freeze
 * filters (so an explicit flag on it can't double-list its id) and never counts
 * toward `hasPinned`. That gate stays driven by the data columns, so a grid
 * with nothing frozen keeps the selection column inline (no sticky offset or
 * boundary shadow). The freeze only resolves once a data column is pinned or
 * locked.
 *
 * The Add column of the new-row slot (see `withNewRowAddColumn`) is locked,
 * so it turns `hasPinned` on. It does not pull the selection column
 * to the left edge, because nothing else is frozen for it to lead.
 *
 * @internal
 */
export function toColumnPinningState<T>(columns: GridColumn<T>[]): {
	state: ColumnPinningState
	hasPinned: boolean
} {
	const select = columns.filter((col) => col.selectable).map((col) => String(col.id))

	const left = columns
		.filter((col) => !col.selectable && frozenSide(col) === 'left')
		.map((col) => String(col.id))

	const right = columns
		.filter((col) => !col.selectable && frozenSide(col) === 'right')
		.map((col) => String(col.id))

	const leads = left.length > 0 || right.some((id) => !isNewRowAddColumn(id))

	return {
		state: { start: leads ? [...select, ...left] : left, end: right },
		hasPinned: left.length > 0 || right.length > 0,
	}
}

/** Element-wise reference equality between two arrays. @internal */
export function sameElements<T>(a: readonly T[], b: readonly T[]): boolean {
	if (a === b) return true

	if (a.length !== b.length) return false

	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false
	}

	return true
}

/**
 * Maps the engine's visible leaf columns back to their source
 * {@link GridColumn}s, in order, through `meta`.
 *
 * @internal
 */
export function toGridColumns<T>(leaves: readonly EngineColumn<T>[]): GridColumn<T>[] {
	return leaves.flatMap((leaf) => leaf.columnDef.meta?.gridColumn ?? [])
}

/** The default size and bounds of an engine column. @internal */
const SIZING_DEFAULTS = getDefaultColumnSizingColumnDef()

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
	return Math.min(
		Math.max(def.minSize ?? SIZING_DEFAULTS.minSize, sized ?? def.size ?? SIZING_DEFAULTS.size),
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

/**
 * Assembles the {@link GridColumnPinning} lookup over a resolved {@link FrozenLayout}.
 *
 * @remarks The Add column of the new-row slot reads as a column that scrolls.
 * Its cells are empty outside the slot, so they draw no sticky surface, rule,
 * or shadow, and the row washes show through them. The layout still holds
 * its offset, so a frozen column of the consumer sticks inside it. The cell
 * of the slot sticks through its own class.
 *
 * @internal
 */
export function buildColumnPinning(layout: FrozenLayout): GridColumnPinning {
	return { column: (id) => (isNewRowAddColumn(id) ? undefined : layout.get(String(id))) }
}

/**
 * The `[min, max]` of the numbers among a column's faceted values, or
 * `undefined` when there is no number. A number or a numeric string counts. A
 * blank cell is no number, so it does not pull the minimum to 0, as
 * `getFacetedMinMaxValues` does.
 *
 * @internal
 */
export function facetSpan(values: Iterable<unknown>): readonly [number, number] | undefined {
	let min = Number.POSITIVE_INFINITY

	let max = Number.NEGATIVE_INFINITY

	for (const value of values) {
		if (typeof value !== 'number' && (typeof value !== 'string' || value.trim() === '')) continue

		const number = Number(value)

		if (!Number.isFinite(number)) continue

		if (number < min) min = number

		if (number > max) max = number
	}

	return min <= max ? [min, max] : undefined
}

/** The facets of a column with none. @internal */
const NO_FACETS: GridColumnFacets = { values: [], span: undefined }

/**
 * The engine actions of {@link GridColumnFilter}. Each reads or writes the
 * engine when it runs.
 *
 * @param manual - Whether the consumer filters. A manual grid holds only the
 *   server page, so its columns have no facets.
 * @internal
 */
export function columnFilterActions<T>(
	table: EngineTable<T>,
	manual: boolean,
): GridColumnFilterActions {
	return {
		setQuery: (id, query) => table.getColumn(String(id))?.setFilterValue(query),
		// Replace the whole applied set with an empty one; it flows through the
		// engine's `onColumnFiltersChange` like any other filter edit.
		clear: () => table.setColumnFilters([]),
		facets: (id) => {
			const facets = manual ? undefined : table.getColumn(String(id))?.getFacetedUniqueValues()

			if (!facets) return NO_FACETS

			const values = [...facets.keys()]
				.filter((value) => value != null && value !== '')
				.map((value) => String(value))

			return {
				values: [...new Set(values)].sort((a, b) => a.localeCompare(b)),
				span: facetSpan(facets.keys()),
			}
		},
	}
}

/**
 * Assembles the {@link GridColumnFilter} value over the applied filters.
 *
 * @internal
 */
export function buildColumnFilters<T>(args: {
	columns: readonly GridColumn<T>[]
	applied: readonly GridColumnFilterState[]
	actions: GridColumnFilterActions
	affordance: GridColumnFilter['affordance']
	openColumn: string | number | null
	requestOpen: (id: string | number | null) => void
}): GridColumnFilter {
	const filterable = new Set(
		args.columns.filter((col) => col.filterable && col.value).map((col) => String(col.id)),
	)

	// A controlled binding can carry any value, so each entry is checked as a query.
	const queries = new Map<string, QueryGroup>()

	for (const entry of args.applied) {
		if (isQueryGroup(entry.value)) queries.set(entry.id, entry.value)
	}

	return {
		canFilter: (id) => filterable.has(String(id)),
		getQuery: (id) => queries.get(String(id)),
		// The same test each header button reads for its accent, so the toolbar
		// affordance shows exactly when a header accent does. A seeded but blank
		// query constrains nothing and reads inactive in both places.
		active: [...queries.values()].some(isQueryActive),
		...args.actions,
		affordance: args.affordance,
		openColumn: args.openColumn,
		requestOpen: args.requestOpen,
	}
}

/** Builds the {@link GridPaginationView} the footer renders from. @internal */
export function buildPaginationView<T>(args: {
	table: EngineTable<T>
	pagination: PaginationState
	manual: boolean
	config: GridPagination
	pageRowCount: number
}): GridPaginationView {
	const { pageIndex, pageSize } = args.pagination

	const onPage = args.pageRowCount

	// Pre-pagination count reflects any client-side filtering; server mode trusts the supplied total.
	const total = args.manual
		? args.config.rowCount
		: args.table.getPrePaginatedRowModel().rows.length

	return {
		pageIndex,
		pageSize,
		pageCount: args.table.getPageCount(),
		rowCount: total,
		from: onPage === 0 ? 0 : pageIndex * pageSize + 1,
		to: onPage === 0 ? 0 : pageIndex * pageSize + onPage,
		canPrevious: args.table.getCanPreviousPage(),
		canNext: args.table.getCanNextPage(),
		pageSizeOptions: args.config.pageSizeOptions,
		// The count is read when the updater runs, and `-1` (unknown) leaves the top
		// open. The engine still clamps the floor at 0.
		setPageIndex: (index) =>
			args.table.setPageIndex((current) => {
				const next = functionalUpdate(index, current)

				const last = args.table.getPageCount() - 1

				return last >= 0 ? clamp(next, 0, last) : next
			}),
		setPageSize: (size) => args.table.setPageSize(size),
	}
}

/**
 * Whether a filterable column shows its filter button. It shows when the grid
 * has data, or — even with an empty view — when this column carries an active
 * filter. A filter that emptied the grid can therefore still be reached and
 * cleared.
 *
 * @internal
 */
export function showsFilterButton(
	filter: GridColumnFilter,
	columnId: string | number,
	interactive: boolean,
	filterQuery: QueryGroup | undefined,
): boolean {
	if (!filter.canFilter(columnId)) return false

	return interactive || (filterQuery?.children.length ?? 0) > 0
}
