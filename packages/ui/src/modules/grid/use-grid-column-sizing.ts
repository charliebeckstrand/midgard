'use client'

import type { Table } from '@tanstack/react-table'
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
import type { DensityLevel } from '../../providers/density/context'
import { isDataColumn } from '../../utilities'
import { DEFAULT_COLUMN_SIZE } from './engine/grid-constants'
import { measureColumns } from './engine/grid-sizing/measure'
import {
	type ColumnSizerEnv,
	type ColumnSizingWrite,
	createColumnSizer,
	type GridColumnSizer,
} from './engine/grid-sizing/sizer'
import type { GridColumn } from './types'

/** Options for {@link useGridColumnSizing}. @internal */
type GridColumnSizingOptions<T> = {
	resizable: boolean
	/**
	 * Whether the consumer controls `columnSizing`. The automatic fit then stands
	 * down, and each auto-size action reports its widths through `onValueChange`.
	 */
	controlled: boolean
	/** The engine. The hook reads and writes it only from its callbacks and effects. */
	table: Table<T>
	/** Visible columns in render order. */
	columns: GridColumn<T>[]
	/** Grid wrapper whose width the columns fill (and which holds the rendered cells). */
	containerRef: RefObject<HTMLElement | null> | undefined
	/**
	 * Fingerprint of the rendered rows (count and end keys), supplied by the
	 * caller from data it already holds. A page turn, filter, or sort that
	 * changes the visible rows re-measures, since new content can be wider. This
	 * hook therefore never forces the engine's Row-per-datum model just to
	 * fingerprint a measurement.
	 */
	rowsSignature: string
	/** Density of the rendered table; a change re-measures (padding and icons scale with it). */
	density: DensityLevel | undefined
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
	 * appended batch — a rows-only change — no longer re-measures and reflows the
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
	/** Whether the first width pass has happened; the table paints once it has. */
	settled: boolean
	/**
	 * The measured floors as a value: a copy of `columnFloors` that changes
	 * identity when a measurement moves a floor. The drag bounds render from it.
	 */
	floors: ReadonlyMap<string, number>
}

/** Whether two floor maps hold the same floors. @internal */
function sameFloors(a: ReadonlyMap<string, number>, b: ReadonlyMap<string, number>): boolean {
	if (a.size !== b.size) return false

	for (const [id, floor] of a) {
		if (b.get(id) !== floor) return false
	}

	return true
}

/**
 * The table's horizontal border chrome (px). Hairline `outline` borders render
 * the table a pixel or two past the summed column widths. That would raise a
 * phantom horizontal scrollbar if the columns filled the full width, so a fit
 * reserves it. @internal
 */
function tableChrome(container: HTMLElement, totalSize: number): number {
	const element = container.querySelector('table')

	if (!element) return 0

	return Math.max(0, Math.round(element.getBoundingClientRect().width - totalSize))
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
 * The automatic fit runs synchronously before paint, so the first frame carries
 * real widths rather than the engine's default. It runs again:
 *
 * - On container resize (`ResizeObserver`).
 * - When the columns / density / rendered rows change.
 * - Once web fonts settle.
 *
 * It stands down when the consumer controls `columnSizing` or the grid is not
 * resizable. The auto-size actions still run under a controlled binding, and
 * they report their widths through `onValueChange`.
 *
 * A pass that finds no body cells measures no content, so every column falls back
 * to its header floor. That is a loading skeleton, an empty result, or a windowed
 * body whose rows haven't landed. That fit is provisional. It is never reused and
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
}: GridColumnSizingOptions<T>): GridColumnSizingResult {
	const automatic = resizable && !controlled

	/**
	 * Whether the first width pass has happened, so the table can be held back until it
	 * has.
	 *
	 * The synchronous fit below already keeps a *client-side* mount from flashing the
	 * engine's default colgroup. A reload is the case it cannot reach. The browser paints
	 * the server's HTML, whose widths are the declared ones, since no measurement has
	 * happened yet. Only then does React hydrate and this fit correct them. That
	 * repaint is the column jump. Nothing can compute a content fit before the DOM
	 * exists, so the fix is to not paint a width that is about to change.
	 *
	 * Flips on the first pass that measures real body cells, not merely the first pass.
	 * A reload arrives with a cold query cache. The fit at hydration therefore sees only
	 * the header, and is provisional by the same test `freezeOnRowChange` uses. The consumer
	 * supplies the escape for a grid that legitimately has no rows to measure.
	 */
	// Seeded from `automatic`, so a grid this hook never sizes is settled on the server
	// too — layout effects don't run there, so a `false` seed would have hidden every
	// non-resizable and consumer-controlled grid until hydration for no reason.
	const [settled, setSettled] = useState(!automatic)

	// The width rules and their state live in the sizer, created once per mount. A
	// restored `columnSizing` mounts it in manual mode, with those columns held.
	const [sizer] = useState(() =>
		createColumnSizer({ floors: columnFloors, seeded: Object.keys(initialSizing ?? {}) }),
	)

	// The floors as a value. Each sizer command can merge a measurement into
	// `columnFloors`, so each one publishes the floors after it runs.
	const [floors, setFloors] = useState<ReadonlyMap<string, number>>(() => new Map(columnFloors))

	const publishFloors = useCallback(
		() => setFloors((prev) => (sameFloors(prev, columnFloors) ? prev : new Map(columnFloors))),
		[columnFloors],
	)

	// Rendered rows' fingerprint — count and end keys — so a page turn, filter,
	// or sort that changes the visible rows re-measures (new content can be
	// wider). Supplied by the caller (see the option) rather than read off
	// `table.getRowModel()`, which would materialize the engine's row model on
	// every mount of every resizable-by-default grid.
	const rowsSig = rowsSignature

	// A non-data column holds the width it declares, and the fit shares the rest.
	// That width is part of the structure, so a new one (the new-row slot's Add
	// column, as it measures its control) re-fits the other columns, even under
	// frozen widths.
	const structSig = useMemo(
		() =>
			`${columns.map((col) => (isDataColumn(col) ? String(col.id) : `${col.id}:${col.width ?? ''}`)).join('')}|${density ?? ''}`,
		[columns, density],
	)

	// The struct signature the sizer's cached content belongs to. A change drops
	// that cache, because the columns or their padding changed under it.
	const cacheSigRef = useRef('')

	// What the sizer reads for one command, or `null` with no layout (jsdom,
	// display:none, a collapsed panel), where a DOM read measures nothing.
	const envOf = useCallback((): ColumnSizerEnv<T> | null => {
		const container = containerRef?.current

		const width = container?.clientWidth ?? 0

		if (!container || !width) return null

		if (cacheSigRef.current !== structSig) {
			sizer.forget()

			cacheSigRef.current = structSig
		}

		return {
			columns,
			// Reserve the table's horizontal border chrome (see `tableChrome`).
			space: fitContent ? 0 : width - tableChrome(container, table.getTotalSize()),
			sizeOf: (id) => table.getColumn(id)?.getSize() ?? DEFAULT_COLUMN_SIZE,
			measure: (scan) => measureColumns({ columns, container, scan }),
		}
	}, [containerRef, columns, fitContent, table, structSig, sizer])

	// Writes what the sizer returns. An automatic fit writes flagged, off the
	// consumer's binding. A user choice writes unflagged, so it persists like a
	// drag. A reset writes flagged and then clears the saved widths. Under a
	// controlled binding every write reports its widths, because the consumer
	// owns the state.
	const commit = useCallback(
		(write: ColumnSizingWrite) => {
			const apply = () => table.setColumnSizing((prev) => nextSizing(prev, write))

			if (controlled || write.persist === 'widths') {
				apply()

				return
			}

			flagged(autoSizingRef, apply)

			if (write.persist === 'clear') clearPreference?.()
		},
		[table, controlled, autoSizingRef, clearPreference],
	)

	const refit = useCallback(
		(fresh: boolean) => {
			const env = automatic ? envOf() : null

			// No layout, or nothing to size: settle anyway. There is no measurement to wait
			// for, and a held paint would hide the table for good in an environment that
			// never reports a width. The ResizeObserver's first non-zero tick fits it.
			if (!env) {
				setSettled(true)

				return
			}

			// A drag-resize owns the widths while it's in flight; don't fight it.
			if (table.getState().columnSizingInfo.isResizingColumn) return

			const write = sizer.refit(env, fresh)

			publishFloors()

			// Settled only once a pass has read real body cells. A provisional pass — the
			// floor-only fit made against a loading skeleton, before the rows arrive — is
			// the one `freezeOnRowChange` below already refuses to trust, and revealing on
			// it is what still let the columns jump: a reload measures headers, paints, and
			// then re-fits the moment the rows land.
			if (sizer.measured()) setSettled(true)

			commit(write)
		},
		[automatic, envOf, table, sizer, commit, publishFloors],
	)

	// Runs one auto-size action. The actions run under a controlled binding too:
	// only the automatic fit stands down there.
	const act = useCallback(
		(command: (env: ColumnSizerEnv<T>) => ColumnSizingWrite | null) => {
			const env = resizable ? envOf() : null

			if (!env) return

			const write = command(env)

			publishFloors()

			if (write) commit(write)
		},
		[resizable, envOf, commit, publishFloors],
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
						table.getState().columnSizingInfo.startSize ??
						table.getColumn(resizing)?.getSize() ??
						0,
				}
			}

			return
		}

		const drag = dragRef.current

		if (!drag) return

		dragRef.current = null

		if (table.getColumn(drag.id)?.getSize() !== drag.start) sizer.takeControl(columns)
	}, [resizing, table, sizer, columns])

	// Keep the latest `refit` reachable from the ResizeObserver without listing it in
	// the observer effect's deps: its identity shifts whenever the columns or density
	// change, and tearing the observer down to re-subscribe on each is needless churn.
	const refitRef = useRef(refit)

	useLayoutEffect(() => {
		refitRef.current = refit
	}, [refit])

	// Re-measure when the inputs `refit` closes over change (columns, density) or the
	// visible rows change (`rowsSig` — a page turn, filter, or sort can bring wider
	// content into view). The observer effect below performs the initial
	// synchronous fit, so the first pass here is skipped.
	const initialFitRef = useRef(false)

	// The struct signature at the last fit, so a rows-only change is told apart from
	// a structural one when the widths are frozen (see `freezeOnRowChange`).
	const fitStructSigRef = useRef(structSig)

	useLayoutEffect(() => {
		if (!automatic) return

		// Read so a row-model change (page turn, filter, sort) re-runs this effect.
		void rowsSig

		if (!initialFitRef.current) {
			initialFitRef.current = true

			fitStructSigRef.current = structSig

			return
		}

		const structChanged = fitStructSigRef.current !== structSig

		fitStructSigRef.current = structSig

		// Frozen widths (infinite scroll's stable columns) hold against an appended
		// batch: a rows-only re-fire re-measures nothing and the columns keep their
		// initial fit. A structural change — columns or density — still re-fits. The
		// freeze arms on the fit that first measured rendered rows, not on a
		// provisional one: a grid whose rows arrive after mount would otherwise freeze
		// the floor-only fit it made against the loading skeleton and hold every
		// column there for good.
		if (freezeOnRowChange && !structChanged && sizer.measured()) return

		refit(true)
	}, [automatic, refit, rowsSig, structSig, freezeOnRowChange, sizer])

	// Fit when the body's rendered rows change and the last pass had none to measure.
	// A windowed body renders its rows in a later commit than the one that supplied
	// them — the virtualizer resolves its scroll element only once the refs have
	// attached (see `useVirtualWindow`) — and that commit moves neither the rows
	// signature nor the struct signature, so nothing above would re-measure it. The
	// body calls this from a layout effect, so the fit lands before those rows paint:
	// their first frame carries the content widths instead of the floor-only fit the
	// empty body measured, and the widths never move again under the user's eyes.
	// Once a pass has read rows this is a bail, leaving the windowed scroll — and
	// `freezeOnRowChange` — to behave exactly as before.
	const fitRenderedRows = useCallback(() => {
		if (!automatic || sizer.measured()) return

		refitRef.current(true)
	}, [automatic, sizer])

	// Own the ResizeObserver in its own effect, keyed only on enablement and the
	// container, so a width-only container resize is the one thing that recreates it
	// — not a column or row change. Fit synchronously, before paint, so the first
	// frame carries real widths instead of flashing the engine's default colgroup.
	// The observer below holds that guarantee for every *later* resize; see it.
	useLayoutEffect(() => {
		const element = containerRef?.current

		// Nothing here will ever size these columns — not resizable, sizing controlled by
		// the consumer, or no `ResizeObserver` (SSR, jsdom). There is nothing to wait for,
		// so let the table paint immediately.
		if (!automatic || !element || typeof ResizeObserver === 'undefined') {
			setSettled(true)

			return
		}

		// Settling is `refit`'s to decide, and only on a pass that measured real body
		// cells. A zero-width container (a collapsed panel, a tab parked in a hidden
		// `Activity`) settles inside `refit` without a fit, and the observer below fits
		// it the moment it has a width — which is the first moment it could be seen.
		refitRef.current(true)

		/*
		 * Flushed, so the refitted columns land in the frame that resized the container.
		 *
		 * The table is `table-fixed` at a pixel width this hook computes. `tableWidth` and
		 * every `<col>` come out of `setColumnSizing`. Between the container changing and
		 * that state committing, the table is laid out for a width the page no longer has. An
		 * ordinary `setState` here commits on a later frame, and something has to paint in
		 * between. That is the table sitting narrow inside its box, or overflowing it.
		 * Anything that resizes the container discretely shows that as a flash — a sidebar
		 * switching to its floating variant, a docked panel opening beside the grid.
		 *
		 * A `ResizeObserver` callback runs after layout and before paint, and mutating the DOM
		 * inside one re-runs layout in the same frame. So flushing here is the whole fix. The
		 * frame that moves the container is the frame that carries the matching widths. That
		 * is the same before-paint guarantee the mount-time fit above already had.
		 *
		 * The cost is that a refit is now on the critical path of the frame rather than the
		 * next one. That is the intended trade. The work is the same work, and a resize the
		 * user has to watch settle is worse than one that takes a longer frame. A pass that
		 * moves no width still writes no state (`sizingMoved`), so a height-only tick — rows
		 * appended, the window growing vertically — flushes nothing.
		 */
		const observer = new ResizeObserver(() => flushSync(() => refitRef.current(false)))

		observer.observe(element)

		return () => observer.disconnect()
	}, [automatic, containerRef])

	useEffect(() => {
		if (!automatic) return

		let canceled = false

		// Web fonts reflow text after the first measure; re-measure once they settle.
		// Subscribed once per enablement (reading the latest `refit` through
		// `refitRef`), since `fonts.ready` settles once — re-subscribing on every
		// `refit` identity change would re-fire immediately and redundantly.
		document.fonts?.ready
			.then(() => {
				if (canceled) return

				sizer.forget()

				refitRef.current(true)
			})
			.catch(() => {})

		return () => {
			canceled = true
		}
	}, [automatic, sizer])

	return { autoSizeColumn, autoSizeAll, resetWidths, takeControl, fitRenderedRows, settled, floors }
}
