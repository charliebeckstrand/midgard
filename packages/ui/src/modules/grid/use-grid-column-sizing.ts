'use client'

import {
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { flushSync } from 'react-dom'
import type { DensityStep } from '../../core/density'
import { useStableEvent } from '../../hooks/use-stable-event'
import { isDataColumn } from '../../utilities'
import { DEFAULT_COLUMN_SIZE } from './engine/grid-constants'
import { type GridFitMode, headerCells } from './engine/grid-sizing/fit-layout'
import { isContentSized, measureColumns } from './engine/grid-sizing/measure'
import {
	type ColumnSizerEnv,
	type ColumnSizingWrite,
	createColumnSizer,
	type GridColumnSizer,
} from './engine/grid-sizing/sizer'
import { sameNumberMap } from './engine/grid-table/equality'
import type { EngineTable } from './engine/grid-table/features'
import type { GridColumn } from './types'

/** Options for {@link useGridColumnSizing}. @internal */
type GridColumnSizingOptions<T> = {
	resizable: boolean
	/**
	 * Whether the consumer controls `columnSizing`. The table then takes the fixed
	 * layout of those widths, and each auto-size action reports its widths through
	 * `onValueChange`. A content-sized column still sizes to its content.
	 */
	controlled: boolean
	/** The engine. The hook reads and writes it only from its callbacks and effects. */
	table: EngineTable<T>
	/** Visible columns in render order. */
	columns: GridColumn<T>[]
	/** Grid wrapper whose width the columns fill (and which holds the rendered cells). */
	containerRef: RefObject<HTMLElement | null> | undefined
	/**
	 * Fingerprint of the set of rendered rows, supplied by the caller from data it
	 * already holds (see `hashKeys`). A page turn or filter that changes the
	 * visible rows re-measures, since new content can be wider. A sort reorders
	 * the same rows, so it keeps the fingerprint and re-measures nothing. This
	 * hook therefore never forces the engine's Row-per-datum model just to
	 * fingerprint a measurement.
	 */
	rowsSignature: string
	/** Density of the rendered table; a change re-measures (padding and icons scale with it). */
	density: DensityStep | undefined
	/**
	 * Size the columns to their own content rather than to the container. Nothing
	 * the pass produces is then measured from the box it is about to size.
	 * @see {@link GridDataProps.width}
	 */
	fitContent: boolean
	/** The column mid drag-resize, or `null`. A drag lays out the fixed layout. */
	resizing: string | null
	/**
	 * Per-column hard floor (px). Each measurement merges into it, and the sizing
	 * clamp and a keyboard nudge read it. A manual resize therefore honors the
	 * minimum that the fit honors, and a single-word header never truncates. A
	 * stable map that the caller owns. The drag bounds read the copy that the hook
	 * returns as {@link GridColumnSizingResult.floors}.
	 */
	columnFloors: Map<string, number>
	/**
	 * Freeze the widths against row-data changes (infinite scroll's stable widths).
	 * An appended batch (a rows-only change) no longer measures, so the columns
	 * keep their least widths. A structural change (columns, density) still
	 * measures again, and the browser still follows a container resize. The first
	 * pass is unaffected.
	 * @defaultValue false
	 */
	freezeOnRowChange?: boolean
	/**
	 * Widths the consumer seeded (a restored/persisted `columnSizing`). The grid
	 * then mounts in manual mode, with those columns held. Empty (a first-time
	 * grid) mounts in auto mode. Read once at mount.
	 */
	initialSizing?: Record<string, number>
	/**
	 * The hook sets it true around its automatic `setColumnSizing` writes. The
	 * table hook can then tell a content fit from a user resize, and keep the fit
	 * off the consumer's `columnSizing.onValueChange`. Owned by the caller.
	 */
	autoSizingRef?: RefObject<boolean>
	/** Clears the consumer's saved widths: fires `columnSizing.onValueChange` with `{}`. */
	clearPreference?: () => void
	/**
	 * Writes the widths of the content-sized columns (see `isContentSized`). They are
	 * no preference, so they stay out of the `columnSizing` state, controlled or not,
	 * and the table hook lays them over it. Owned by the caller.
	 */
	setContentSizing: (update: (prev: Record<string, number>) => Record<string, number>) => void
}

/** The widths and actions {@link useGridColumnSizing} returns. @internal */
type GridColumnSizingResult = {
	/** "Auto-size this column" (also the handle's double-click, double tap, and Enter). */
	autoSizeColumn: (id: string | number) => void
	/** "Auto-size all columns". */
	autoSizeAll: () => void
	/** "Reset column widths". */
	resetWidths: () => void
	/** Takes width control for the user; a keyboard nudge calls it. */
	takeControl: () => void
	/**
	 * Copies the widths of the automatic layout into the sizing state in this
	 * task. A drag start and a keyboard nudge call it before they read a width.
	 */
	syncWidths: () => void
	/** Ends a drag-resize, from the last drag state of the engine. A drag that moved takes control. */
	endDrag: (drag: { deltaOffset: number | null }) => void
	fitRenderedRows: () => void
	/** Whether the sizer is in `manual` mode: a user width change holds the columns. */
	manual: boolean
	/**
	 * The mode of the automatic table layout while the grid renders it, else
	 * `null`. The grid renders it in `auto` mode, on the server too, while no drag
	 * is in flight. The browser then sizes the columns, and the sizing state only
	 * copies their widths.
	 */
	fit: GridFitMode | null
	/**
	 * The least width (px) of each column that the browser sizes, by column id
	 * (see `createColumnSizer`, rule 1). Empty outside the automatic layout. While
	 * it holds a width, the body content sizes no column (see `k.fit.held`).
	 */
	least: ReadonlyMap<string, number>
	/**
	 * The measured floors as a value: a copy of `columnFloors` that changes
	 * identity when a measurement moves a floor. The drag bounds render from it.
	 */
	floors: ReadonlyMap<string, number>
}

/** The least widths outside the automatic layout. @internal */
const NO_LEAST: ReadonlyMap<string, number> = new Map()

/**
 * Whether `next` moves any column off `prev`. A height-only resize tick must not
 * allocate a fresh sizing object and re-render the head, body, and footer for
 * nothing. Nor must any change landing on the same pixels. @internal
 */
function sizingMoved(prev: Record<string, number>, next: Record<string, number>): boolean {
	for (const id in next) {
		if (prev[id] !== next[id]) return true
	}

	return false
}

/**
 * The next sizing state for a write: `prev` when nothing moves, so that a no-op
 * pass renders nothing. A replace also drops every width that `sizing` does not
 * name. @internal
 */
function nextSizing(
	prev: Record<string, number>,
	{ sizing, replace }: ColumnSizingWrite,
): Record<string, number> {
	if (!replace) return sizingMoved(prev, sizing) ? { ...prev, ...sizing } : prev

	const same = Object.keys(prev).length === Object.keys(sizing).length && !sizingMoved(prev, sizing)

	return same ? prev : sizing
}

/**
 * Splits a write into the widths of the content-sized columns (see
 * `isContentSized`) and the write of every other column. @internal
 */
function splitContentSizing<T>(
	write: ColumnSizingWrite,
	columns: readonly GridColumn<T>[],
): [Record<string, number>, ColumnSizingWrite] {
	const ids = new Set(columns.filter(isContentSized).map((col) => String(col.id)))

	const content: Record<string, number> = {}

	const rest: Record<string, number> = {}

	for (const [id, width] of Object.entries(write.sizing)) {
		if (ids.has(id)) content[id] = width
		else rest[id] = width
	}

	return [content, { ...write, sizing: rest }]
}

/**
 * Runs a write with `ref` held true, so the table hook keeps it off the
 * consumer's `onValueChange` (see `autoSizingRef`). @internal
 */
function flagged(ref: RefObject<boolean> | undefined, write: () => void): void {
	if (!ref) {
		write()

		return
	}

	ref.current = true

	try {
		write()
	} finally {
		ref.current = false
	}
}

/**
 * Connects a resizable grid to its {@link GridColumnSizer}, which holds the
 * width rules (see {@link createColumnSizer}). This hook supplies the DOM reads
 * and the React triggers, and it writes what the sizer returns.
 *
 * In `auto` mode the browser sizes the columns. The table keeps the automatic
 * table layout on the server and in every render (see `fit`), so hydration
 * and a container resize move no column that the browser does not move. The
 * hook reads the content of the rendered rows into the least widths of the
 * columns (see `least`):
 *
 * - At mount, and after a reset.
 * - At the first width of a grid that had no layout at mount.
 * - When the columns / density / rendered rows change.
 * - Once web fonts settle, when they were still loading at mount.
 *
 * A `ResizeObserver` copies the widths that the browser lays out into the
 * sizing state, without the consumer's binding. The resize bounds, the
 * separator values, and the settled-width store then read the widths on the
 * screen. A drag, a nudge, or an auto-size action first copies the widths in
 * the same task. The fixed layout that it lays out then paints the same pixels.
 *
 * In `manual` mode and under controlled widths, the table takes the fixed
 * layout of the sizing state. The same triggers size the columns that no hold
 * reaches: the content-sized columns, and a data column that the user shows
 * after the hold.
 *
 * A pass that finds no body cells measures no content. That is a loading
 * skeleton, an empty result, or a windowed body whose rows haven't landed. That
 * pass is provisional, and `fitRenderedRows` measures again from the body's own
 * layout effect the moment real rows render, before they paint.
 *
 * A drag that moves a column takes width control for the user. A press on the
 * handle that moves nothing does not.
 *
 * @internal
 */
export function useGridColumnSizing<T>({
	resizable,
	controlled,
	table,
	columns,
	containerRef,
	rowsSignature,
	density,
	fitContent,
	resizing,
	columnFloors,
	freezeOnRowChange = false,
	initialSizing,
	autoSizingRef,
	clearPreference,
	setContentSizing,
}: GridColumnSizingOptions<T>): GridColumnSizingResult {
	// Whether the width passes run. A controlled binding holds the data columns, but
	// a content-sized column is never the consumer's to size, so its pass still runs.
	const automatic = resizable && (!controlled || columns.some(isContentSized))

	// The width rules and their state live in the sizer, created once per mount. A
	// restored `columnSizing` mounts it in manual mode, with those columns held.
	const [sizer] = useState(() =>
		createColumnSizer({ floors: columnFloors, seeded: Object.keys(initialSizing ?? {}) }),
	)

	// The mode of the sizer as render state, because the layout of the table follows it.
	const [manual, setManual] = useState(() => sizer.mode() === 'manual')

	// The least widths of the sizer as render state (see `least`).
	const [least, setLeast] = useState(sizer.least)

	// Whether the browser sizes the data columns (`auto` mode).
	const auto = resizable && !controlled && !manual

	// A drag lays the columns out in the fixed layout, from the widths that the drag
	// start copied. A drag that moves nothing then gives the widths back.
	const layoutAuto = auto && resizing == null

	const fitMode: GridFitMode = fitContent ? 'content' : 'fill'

	// The floors as a value. Each sizer command can merge a measurement into
	// `columnFloors`, so each one publishes the floors after it runs.
	const [floors, setFloors] = useState<ReadonlyMap<string, number>>(() => new Map(columnFloors))

	const publishFloors = useCallback(
		() => setFloors((prev) => (sameNumberMap(prev, columnFloors) ? prev : new Map(columnFloors))),
		[columnFloors],
	)

	// Renders the mode and the least widths of the sizer after a command.
	const publishSizer = useCallback(() => {
		setManual(sizer.mode() === 'manual')

		setLeast(sizer.least())
	}, [sizer])

	// A non-data column holds the width it declares, and the browser sizes the rest.
	// That width is part of the structure, so a new one (the new-row slot's Add
	// column, as it measures its control) reads the columns again, even under
	// frozen widths.
	const structSignature = useMemo(
		() =>
			`${columns.map((col) => (isDataColumn(col) ? String(col.id) : `${col.id}:${col.width ?? ''}`)).join('')}|${density ?? ''}`,
		[columns, density],
	)

	// The struct signature the sizer's cached content belongs to. A change drops
	// that cache, because the columns or their padding changed under it.
	const cacheSignatureRef = useRef('')

	// What the sizer reads for one command, or `null` with no layout (jsdom,
	// display:none, a collapsed panel), where a DOM read measures nothing.
	const readEnv = useCallback((): ColumnSizerEnv<T> | null => {
		const container = containerRef?.current

		if (!container?.clientWidth) return null

		if (cacheSignatureRef.current !== structSignature) {
			sizer.forget()

			cacheSignatureRef.current = structSignature
		}

		return {
			columns,
			getSize: (id) => table.getColumn(id)?.getSize() ?? DEFAULT_COLUMN_SIZE,
			measure: (scan) => measureColumns({ columns, container, scan }),
		}
	}, [containerRef, columns, table, structSignature, sizer])

	// Writes what the sizer returns. The widths of the content-sized columns go to
	// their own state. A copy of the layout writes the rest flagged, off the
	// consumer's binding. A user choice writes unflagged, so it persists like a drag.
	// A reset writes flagged and then clears the saved widths. Under a controlled
	// binding a copy writes no data width, and every other write reports its widths,
	// because the consumer owns the state.
	const commit = useCallback(
		(write: ColumnSizingWrite) => {
			const [content, owned] = splitContentSizing(write, columns)

			setContentSizing((prev) => (sizingMoved(prev, content) ? { ...prev, ...content } : prev))

			const apply = () => table.setColumnSizing((prev) => nextSizing(prev, owned))

			if (controlled && write.persist === 'none') return

			if (controlled || write.persist === 'widths') {
				apply()

				return
			}

			flagged(autoSizingRef, apply)

			if (write.persist === 'clear') clearPreference?.()
		},
		[table, columns, controlled, autoSizingRef, clearPreference, setContentSizing],
	)

	// Copies the widths of the automatic layout into the sizing state. The browser
	// gives a column the width of its header at least, and a measured floor rounds
	// up. A width under the floor therefore becomes the floor, so the floor clamp
	// of the sizing state keeps the width that the browser laid out.
	const copyLayout = useCallback(() => {
		const container = containerRef?.current

		if (!container) return

		const headers = headerCells(container, columns)

		const sizing: Record<string, number> = {}

		for (const col of columns) {
			const id = String(col.id)

			const width = headers.get(id)?.getBoundingClientRect().width

			if (!width || (!isDataColumn(col) && !isContentSized(col))) continue

			sizing[id] = width

			if (width < (columnFloors.get(id) ?? 0)) columnFloors.set(id, width)
		}

		publishFloors()

		commit({ sizing, replace: false, persist: 'none' })
	}, [containerRef, columns, columnFloors, publishFloors, commit])

	// Copies the layout in this task, before a command reads the sizing state. One
	// identity for the mount, so the resize actions keep theirs.
	const syncWidths = useStableEvent(() => {
		if (layoutAuto) flushSync(copyLayout)
	})

	/**
	 * One pass. In `auto` mode it reads the least widths (see
	 * {@link GridColumnSizer.observe}), and `replace` reads them again. Otherwise it
	 * sizes the columns of the fixed layout that no hold reaches, and `fresh` reads
	 * the DOM again.
	 */
	const refit = useCallback(
		(fresh: boolean, replace: boolean) => {
			const env = automatic ? readEnv() : null

			// No layout, or nothing to size. The ResizeObserver or the next trigger runs
			// the pass in the frame that shows the grid.
			if (!env) return

			// A drag-resize owns the widths while it's in flight; don't fight it.
			if (table.atoms.columnResizing.get().isResizingColumn) return

			if (auto) {
				sizer.observe(env, replace)

				setLeast(sizer.least())

				copyLayout()

				return
			}

			const write = sizer.refit(env, fresh)

			publishFloors()

			commit(write)
		},
		[automatic, auto, readEnv, table, sizer, commit, publishFloors, copyLayout],
	)

	// Runs one auto-size action. The actions run under a controlled binding too:
	// only the passes of `auto` mode stand down there.
	const act = useCallback(
		(command: (env: ColumnSizerEnv<T>) => ColumnSizingWrite | null) => {
			const env = resizable ? readEnv() : null

			if (!env) return

			syncWidths()

			const write = command(env)

			publishFloors()

			if (write) commit(write)

			publishSizer()
		},
		[resizable, readEnv, syncWidths, commit, publishFloors, publishSizer],
	)

	const autoSizeColumn = useCallback(
		(id: string | number) => act((env) => sizer.sizeColumn(env, String(id))),
		[act, sizer],
	)

	const autoSizeAll = useCallback(() => act((env) => sizer.sizeAll(env)), [act, sizer])

	const resetWidths = useCallback(() => {
		if (!resizable) return

		commit(sizer.reset())

		publishSizer()
	}, [resizable, sizer, commit, publishSizer])

	const takeControl = useCallback(() => {
		sizer.takeControl(columns)

		publishSizer()
	}, [sizer, columns, publishSizer])

	// A drag that moved its column takes width control, as a keyboard nudge does.
	// A press that moved nothing does not: each click of a double-click registers as
	// a drag, and a click is not a resize. It runs in the event that ends the drag,
	// so the commit that ends the drag also lays out the mode that follows it.
	const endDrag = useCallback(
		(drag: { deltaOffset: number | null }) => {
			if (drag.deltaOffset) takeControl()
		},
		[takeControl],
	)

	// The latest `refit`, with one identity for the mount. The ResizeObserver and the
	// font subscription call it without a re-subscribe each time the columns or the
	// density change. React writes the newest `refit` before any layout effect of a
	// commit runs, so the body, which calls `fitRenderedRows` from its own layout
	// effect, reads the `refit` of that commit.
	const refitLatest = useStableEvent(refit)

	// The pass of an automatic layout with no least width: the mount, and a reset. The
	// body content sizes the columns of that layout, and the pass reads it. A pass
	// that reads no row keeps the map, so it runs once until a trigger below.
	useLayoutEffect(() => {
		if (layoutAuto && least.size === 0) refitLatest(true, true)
	}, [layoutAuto, least, refitLatest])

	// Read again when the columns or the density change, when `fitContent` changes
	// the space that the columns share, or when the visible rows change
	// (`rowsSignature`: a page turn or filter can bring wider content into view).
	// Keyed on those values and not on the identity of `refit`, which also moves with
	// callbacks that change no width, so a render that changes none of them measures
	// nothing. The values at the last pass tell a change of the rows alone from a
	// change of the structure when the widths are frozen (see `freezeOnRowChange`).
	// They are `null` at mount, where the pass of the fixed layout runs. The effect
	// above runs the pass of the automatic layout.
	const fittedRef = useRef<{
		columns: readonly GridColumn<T>[]
		struct: string
		rows: string
		fitContent: boolean
	} | null>(null)

	useLayoutEffect(() => {
		if (!automatic) return

		const fitted = fittedRef.current

		fittedRef.current = { columns, struct: structSignature, rows: rowsSignature, fitContent }

		if (fitted === null) {
			if (!auto) refitLatest(true, false)

			return
		}

		// A new `columns` can carry new width rules (a `minWidth`, a `maxWidth`) under the
		// same ids, so it counts as a change of the structure.
		const structChanged =
			fitted.columns !== columns ||
			fitted.struct !== structSignature ||
			fitted.fitContent !== fitContent

		const rowsChanged = fitted.rows !== rowsSignature

		if (!structChanged && !rowsChanged) return

		// Frozen widths (infinite scroll's stable columns) hold against an appended
		// batch: a change of the rows alone measures nothing, and the columns keep
		// their first widths. A change of the structure still reads them again. The
		// freeze arms on the pass that first measured rendered rows, not on a
		// provisional one: a grid whose rows arrive after mount would otherwise freeze
		// the widths of the loading skeleton for good.
		if (freezeOnRowChange && !structChanged && sizer.measured()) return

		refitLatest(true, structChanged)
	}, [
		automatic,
		auto,
		refitLatest,
		columns,
		rowsSignature,
		structSignature,
		fitContent,
		freezeOnRowChange,
		sizer,
	])

	// Measure when the body's rendered rows change and the last pass had none to
	// measure. A windowed body renders its rows in a later commit than the one
	// that supplied them, because the virtualizer resolves its scroll element
	// only once the refs have attached (see `useVirtualWindow`). That commit
	// moves neither the rows signature nor the struct signature, so nothing above
	// would measure it. The body calls this from a layout effect, so the pass
	// lands before those rows paint. Once a pass has read rows this is a bail, and
	// the windowed scroll holds the widths.
	const fitRenderedRows = useCallback(() => {
		if (!automatic || sizer.measured()) return

		refitLatest(true, false)
	}, [automatic, sizer, refitLatest])

	// Web fonts reflow text after a pass that ran while they loaded, so read again
	// once they settle. Only a pass that ran during a load needs it: when the fonts
	// were already loaded, the pass read the final text. `fonts.ready` settles once,
	// so this subscribes once per enablement and reads the latest `refit`.
	useEffect(() => {
		if (!automatic || document.fonts?.status !== 'loading') return

		let canceled = false

		document.fonts.ready
			.then(() => {
				if (canceled) return

				sizer.forget()

				refitLatest(true, true)
			})
			.catch(() => {})

		return () => {
			canceled = true
		}
	}, [automatic, refitLatest, sizer])

	// Copies each width that the browser lays out into the sizing state (see
	// `copyLayout`). A copy is not visual, so it commits in its own frame. A grid
	// that had no layout at its pass (a collapsed panel, a hidden tab) gets its pass
	// here, at the first width that it shows.
	const onLayout = useStableEvent(() => {
		if (!sizer.measured()) refit(true, true)
		else if (layoutAuto) copyLayout()
	})

	useLayoutEffect(() => {
		const container = containerRef?.current

		if (!automatic || !container || typeof ResizeObserver === 'undefined') return

		const observer = new ResizeObserver(() => onLayout())

		for (const th of headerCells(container, columns).values()) observer.observe(th)

		return () => observer.disconnect()
	}, [automatic, containerRef, columns, onLayout])

	return {
		autoSizeColumn,
		autoSizeAll,
		resetWidths,
		takeControl,
		syncWidths,
		endDrag,
		fitRenderedRows,
		manual,
		fit: layoutAuto ? fitMode : null,
		least: layoutAuto ? least : NO_LEAST,
		floors,
	}
}
