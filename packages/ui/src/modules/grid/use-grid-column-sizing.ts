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
import { type GridFitMode, readFitLayout } from './engine/grid-sizing/fit-layout'
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
	 * Whether the consumer controls `columnSizing`. The automatic fit of the data
	 * columns then stands down, and each auto-size action reports its widths
	 * through `onValueChange`. A content-sized column still fits.
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
	/** The column mid drag-resize, or `null`. A drag that moves its column takes width control. */
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
	 * Freeze the fit against row-data changes (infinite scroll's stable widths). An
	 * appended batch (a rows-only change) no longer re-measures and reflows the
	 * columns. A structural change (columns, density) and a container resize still
	 * re-fit. The initial fit is unaffected.
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
	/** "Auto-size this column" (also the handle's double-click and Enter). */
	autoSizeColumn: (id: string | number) => void
	/** "Auto-size all columns". */
	autoSizeAll: () => void
	/** "Reset column widths". */
	resetWidths: () => void
	/** Takes width control for the user; a keyboard nudge calls it. */
	takeControl: () => void
	fitRenderedRows: () => void
	/**
	 * The mode of the fit layout while the grid renders it, else `null`. The fit
	 * layout is the browser's automatic table layout, before the first fit keeps
	 * its widths (see {@link readFitLayout}). The server and the first render of a
	 * grid whose widths the browser sizes render it. The first fit ends it, in the
	 * commit before the first paint of the client.
	 */
	fit: GridFitMode | null
	/**
	 * The measured floors as a value: a copy of `columnFloors` that changes
	 * identity when a measurement moves a floor. The drag bounds render from it.
	 */
	floors: ReadonlyMap<string, number>
}

/**
 * The width that a fit fills (px). A sticky or virtualized grid puts its table in
 * a scroll region whose `scrollbar-gutter: stable` keeps the track of the
 * scrollbar. The table fills the content box of that region, so a change of
 * that box is the change that a fit follows. A grid with no scroll region fills
 * its container. @internal
 */
function fitWidth(container: HTMLElement): number {
	const scroller = container
		.querySelector('table')
		?.closest<HTMLElement>('[data-slot="grid-scroll"]')

	// A grid in the detail panel of another grid can find the scroll region of
	// the outer grid. That region is not in this container, so it does not apply.
	return scroller && container.contains(scroller) ? scroller.clientWidth : container.clientWidth
}

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
 * The server and the first render lay the table out in the fit layout (see
 * `fitting`), so the browser sizes the columns of the first paint. The first fit
 * runs synchronously before the first paint of the client. It keeps the widths
 * of that layout, so hydration moves no column. It runs again:
 *
 * - On container resize (`ResizeObserver`).
 * - When the columns / density / rendered rows change.
 * - Once web fonts settle, when they were still loading at the first fit.
 *
 * It stands down when the consumer controls `columnSizing` or the grid is not
 * resizable. The auto-size actions still run under a controlled binding, and
 * they report their widths through `onValueChange`.
 *
 * A pass that finds no body cells measures no content, so the columns fit the
 * header alone. That is a loading skeleton, an empty result, or a windowed body
 * whose rows haven't landed. That fit is provisional. It is never reused and
 * never frozen, and `fitRenderedRows` re-fits from the body's own layout effect
 * the moment real rows render, before they paint. A grid whose rows arrive after
 * mount therefore shows its content widths in the first frame that shows the
 * content, and holds them from there.
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
	// a content-sized column is never the consumer's to size, so its fit still runs.
	const automatic = resizable && (!controlled || columns.some(isContentSized))

	/**
	 * Whether a pass has kept the widths of the fit layout (see `fitting`).
	 *
	 * The server cannot measure, so a grid whose widths the browser sizes renders the
	 * fit layout there. The browser lays the columns out from their content, and that
	 * first paint is the final layout. The first fit reads those widths and keeps them,
	 * so the fixed layout of the hydrated grid paints the same pixels. A pass with no
	 * layout (a collapsed panel, a hidden tab) keeps no width. The fixed layout then
	 * takes the declared widths until the observer below fits it.
	 *
	 * Seeded from `automatic`: a grid that this hook never sizes renders no fit layout,
	 * so its mount does not render again to leave one.
	 */
	const [fitted, setFitted] = useState(!automatic)

	// The fit layout applies to the grid that the browser sizes from the first render: an
	// automatic grid with no controlled widths and no saved widths. A grid with saved
	// widths mounts in `manual` mode, and its server render holds those widths.
	const fitting =
		automatic && !controlled && Object.keys(initialSizing ?? {}).length === 0 && !fitted

	const fitMode: GridFitMode = fitContent ? 'content' : 'fill'

	// The width rules and their state live in the sizer, created once per mount. A
	// restored `columnSizing` mounts it in manual mode, with those columns held.
	const [sizer] = useState(() =>
		createColumnSizer({ floors: columnFloors, seeded: Object.keys(initialSizing ?? {}) }),
	)

	// The floors as a value. Each sizer command can merge a measurement into
	// `columnFloors`, so each one publishes the floors after it runs.
	const [floors, setFloors] = useState<ReadonlyMap<string, number>>(() => new Map(columnFloors))

	const publishFloors = useCallback(
		() => setFloors((prev) => (sameNumberMap(prev, columnFloors) ? prev : new Map(columnFloors))),
		[columnFloors],
	)

	// A non-data column holds the width it declares, and the fit shares the rest.
	// That width is part of the structure, so a new one (the new-row slot's Add
	// column, as it measures its control) re-fits the other columns, even under
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

		const width = container ? fitWidth(container) : 0

		if (!container || !width) return null

		if (cacheSignatureRef.current !== structSignature) {
			sizer.forget()

			cacheSignatureRef.current = structSignature
		}

		return {
			columns,
			getSize: (id) => table.getColumn(id)?.getSize() ?? DEFAULT_COLUMN_SIZE,
			measure: (scan) => measureColumns({ columns, container, scan }),
			fit: (plan) => readFitLayout(container, columns, { ...plan, mode: fitMode }),
		}
	}, [containerRef, columns, fitMode, table, structSignature, sizer])

	// Writes what the sizer returns. The widths of the content-sized columns go to
	// their own state. An automatic fit writes the rest flagged, off the consumer's
	// binding. A user choice writes unflagged, so it persists like a drag. A reset
	// writes flagged and then clears the saved widths. Under a controlled binding
	// the automatic fit writes no data width, and every other write reports its
	// widths, because the consumer owns the state.
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

	const refit = useCallback(
		(fresh: boolean) => {
			const env = automatic ? readEnv() : null

			// No layout, or nothing to size. There is no fit layout to keep, and the fit
			// layout would hold the separators back for good in an environment that never
			// reports a width. The fixed layout takes the declared widths, and the
			// ResizeObserver's first non-zero tick fits it, in the frame that shows it.
			if (!env) {
				setFitted(true)

				return
			}

			// A drag-resize owns the widths while it's in flight; don't fight it.
			if (table.atoms.columnResizing.get().isResizingColumn) return

			const write = sizer.refit(env, fresh)

			publishFloors()

			// The widths of the fit layout are in the write, so the fixed layout takes over.
			setFitted(true)

			commit(write)
		},
		[automatic, readEnv, table, sizer, commit, publishFloors],
	)

	// Runs one auto-size action. The actions run under a controlled binding too:
	// only the automatic fit stands down there.
	const act = useCallback(
		(command: (env: ColumnSizerEnv<T>) => ColumnSizingWrite | null) => {
			const env = resizable ? readEnv() : null

			if (!env) return

			const write = command(env)

			publishFloors()

			if (write) commit(write)
		},
		[resizable, readEnv, commit, publishFloors],
	)

	const autoSizeColumn = useCallback(
		(id: string | number) => act((env) => sizer.sizeColumn(env, String(id))),
		[act, sizer],
	)

	const autoSizeAll = useCallback(() => act((env) => sizer.sizeAll(env)), [act, sizer])

	const resetWidths = useCallback(() => act((env) => sizer.reset(env)), [act, sizer])

	const takeControl = useCallback(() => sizer.takeControl(columns), [sizer, columns])

	// A drag that moved its column takes width control, as a keyboard nudge does.
	// A press that moved nothing does not: each click of a double-click registers as
	// a drag, and a click is not a resize. A layout effect, so the control lands in
	// the commit that ends the drag, before a ResizeObserver tick can fit again.
	const dragRef = useRef<{ id: string; start: number } | null>(null)

	useLayoutEffect(() => {
		if (resizing) {
			if (!dragRef.current) {
				dragRef.current = {
					id: resizing,
					start:
						table.atoms.columnResizing.get().startSize ?? table.getColumn(resizing)?.getSize() ?? 0,
				}
			}

			return
		}

		const drag = dragRef.current

		if (!drag) return

		dragRef.current = null

		// The engine writes a dragged width rounded to 0.01px, and a fitted width can be
		// finer. A press without motion thus moves the width by less than 0.01px.
		const end = table.getColumn(drag.id)?.getSize() ?? drag.start

		if (Math.abs(end - drag.start) >= 0.01) sizer.takeControl(columns)
	}, [resizing, table, sizer, columns])

	// The latest `refit`, with one identity for the mount. The ResizeObserver and the
	// font subscription call it without a re-subscribe each time the columns or the
	// density change. React writes the newest `refit` before any layout effect of a
	// commit runs, so the body, which calls `fitRenderedRows` from its own layout
	// effect, reads the `refit` of that commit.
	const refitLatest = useStableEvent(refit)

	// Re-measure when the columns or the density change, when `fitContent` changes
	// the space the fit shares, or when the visible rows change (`rowsSignature`: a
	// page turn or filter can bring wider content into view). Keyed on those values
	// and not on the identity of `refit`, which also moves with callbacks that change
	// no width, so a render that changes none of them measures nothing. The values at
	// the last pass tell a change of the rows alone from a change of the structure
	// when the widths are frozen (see `freezeOnRowChange`). They are `null` before the
	// first pass, which this effect skips, because the observer effect below performs
	// the initial synchronous fit.
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

		if (fitted === null) return

		// A new `columns` can carry new width rules (a `minWidth`, a `maxWidth`) under the
		// same ids, so it counts as a change of the structure.
		const structChanged =
			fitted.columns !== columns ||
			fitted.struct !== structSignature ||
			fitted.fitContent !== fitContent

		const rowsChanged = fitted.rows !== rowsSignature

		if (!structChanged && !rowsChanged) return

		// Frozen widths (infinite scroll's stable columns) hold against an appended
		// batch: a change of the rows alone re-measures nothing, and the columns keep
		// their initial fit. A change of the structure still re-fits. The freeze arms
		// on the fit that first measured rendered rows, not on a provisional one: a
		// grid whose rows arrive after mount would otherwise freeze the floor-only fit
		// it made against the loading skeleton and hold every column there for good.
		if (freezeOnRowChange && !structChanged && sizer.measured()) return

		refitLatest(true)
	}, [
		automatic,
		refitLatest,
		columns,
		rowsSignature,
		structSignature,
		fitContent,
		freezeOnRowChange,
		sizer,
	])

	// Fit when the body's rendered rows change and the last pass had none to
	// measure. A windowed body renders its rows in a later commit than the one
	// that supplied them, because the virtualizer resolves its scroll element
	// only once the refs have attached (see `useVirtualWindow`). That commit
	// moves neither the rows signature nor the struct signature, so nothing above
	// would re-measure it. The body calls this from a layout effect, so the fit
	// lands before those rows paint: their first frame carries the content widths
	// instead of the floor-only fit the empty body measured, and the widths never
	// move again under the user's eyes. Once a pass has read rows this is a bail,
	// leaving the windowed scroll (and `freezeOnRowChange`) to behave exactly as
	// before.
	const fitRenderedRows = useCallback(() => {
		if (!automatic || sizer.measured()) return

		refitLatest(true)
	}, [automatic, sizer, refitLatest])

	// Own the ResizeObserver in its own effect, keyed only on enablement and the
	// container, so a width-only container resize is the one thing that recreates it,
	// not a column or row change. Fit synchronously, before paint, so the first
	// frame carries real widths instead of flashing the engine's default colgroup.
	// The observer below holds that guarantee for every *later* resize; see it.
	useLayoutEffect(() => {
		const container = containerRef?.current

		// Nothing here will ever size these columns: the grid is not resizable, the
		// consumer controls sizing, or there is no `ResizeObserver` (SSR, jsdom).
		// The fixed layout takes over at once.
		if (!automatic || !container || typeof ResizeObserver === 'undefined') {
			setFitted(true)

			return
		}

		// A zero-width container (a collapsed panel, a tab parked in a hidden `Activity`)
		// gets no fit here, and the observer below fits it the moment it has a width,
		// which is the first moment it could be seen.
		refitLatest(true)

		// Web fonts reflow text after a measure that ran while they loaded, so re-measure
		// once they settle. Only a fit that ran during a load needs it: when the fonts were
		// already loaded, the fit above read the final text, and a second pass would read
		// the same widths at the full cost of a measure. `fonts.ready` settles once, so
		// this subscribes once per enablement and reads the latest `refit`.
		let canceled = false

		if (document.fonts?.status === 'loading') {
			document.fonts.ready
				.then(() => {
					if (canceled) return

					sizer.forget()

					refitLatest(true)
				})
				.catch(() => {})
		}

		/*
		 * Flushed, so the refitted columns land in the frame that resized the container.
		 *
		 * The table is `table-fixed` at a pixel width this hook computes. `tableWidth` and
		 * every `<col>` come out of `setColumnSizing`. Between the container changing and
		 * that state committing, the table is laid out for a width the page no longer has. An
		 * ordinary `setState` here commits on a later frame, and something has to paint in
		 * between. That is the table sitting narrow inside its box, or overflowing it.
		 * Anything that resizes the container discretely shows that as a flash: a sidebar
		 * switching to its floating variant, a docked panel opening beside the grid.
		 *
		 * A `ResizeObserver` callback runs after layout and before paint, and mutating the DOM
		 * inside one re-runs layout in the same frame. So flushing here is the whole fix. The
		 * frame that moves the container is the frame that carries the matching widths. That
		 * is the same before-paint guarantee the mount-time fit above already had.
		 *
		 * The cost is that a refit is now on the critical path of the frame rather than the
		 * next one. That is the intended trade. The work is the same work, and a resize the
		 * user has to watch settle is worse than one that takes a longer frame.
		 *
		 * Only a new fit width refits. A height-only tick (rows appended, the window growing
		 * vertically) and the first tick of the observation keep the width that the
		 * observer last fit, so they flush nothing.
		 *
		 * A flush that renders also renders each update that waits, because React renders
		 * the sync and default lanes together. Rows that land in the frame of the tick are
		 * such an update, and they resize the container again in the same delivery. The
		 * browser then holds that notification for the next frame, and fires
		 * "ResizeObserver loop completed with undelivered notifications" on `window`. Thus
		 * a refit stops the observation for the rest of the delivery, and observes again in
		 * the next frame, before the delivery of that frame. The new observation reports
		 * the width that it finds, so no resize is lost.
		 */
		let width = fitWidth(container)

		let frame = 0

		const observer = new ResizeObserver(() => {
			const next = fitWidth(container)

			if (next === width) return

			width = next

			observer.disconnect()

			flushSync(() => refitLatest(false))

			// The flush can unmount the grid, and the cleanup below then runs inside it.
			if (!canceled) frame = requestAnimationFrame(() => observer.observe(container))
		})

		observer.observe(container)

		return () => {
			canceled = true

			cancelAnimationFrame(frame)

			observer.disconnect()
		}
	}, [automatic, containerRef, refitLatest, sizer])

	return {
		autoSizeColumn,
		autoSizeAll,
		resetWidths,
		takeControl,
		fitRenderedRows,
		fit: fitting ? fitMode : null,
		floors,
	}
}

/**
 * Fires the column-resize drag lifecycle. The engine flags the column under an
 * active pointer/touch drag in `columnSizingInfo.isResizingColumn` (a keyboard
 * nudge writes the width straight through `columnSizing` instead). A transition
 * off or onto a column id therefore brackets the drag. The outgoing column ends
 * first (a settle, or a pointer that slid onto another handle), then the
 * incoming one starts. An unmount during a drag ends it. Read from the engine
 * and fired from an effect, keeping the
 * callbacks out of the controlled-state write path. Kept out of
 * {@link useGridTable} for its cognitive-complexity budget.
 *
 * @internal
 */
export function useColumnResizeLifecycle(
	resizable: boolean,
	isResizingColumn: string | false,
	onResizeStart: ((id: string) => void) | undefined,
	onResizeEnd: ((id: string) => void) | undefined,
): void {
	const resizingColumnId = resizable ? isResizingColumn : false

	const prevResizingRef = useRef<string | false>(false)

	useEffect(() => {
		const prev = prevResizingRef.current

		if (prev === resizingColumnId) return

		prevResizingRef.current = resizingColumnId

		if (prev) onResizeEnd?.(prev)

		if (resizingColumnId) onResizeStart?.(resizingColumnId)
	}, [resizingColumnId, onResizeStart, onResizeEnd])

	// A grid that unmounts during a drag ends it, so each start has its end.
	const endOnUnmount = useStableEvent(() => {
		const prev = prevResizingRef.current

		if (prev) onResizeEnd?.(prev)
	})

	useEffect(() => endOnUnmount, [endOnUnmount])
}
