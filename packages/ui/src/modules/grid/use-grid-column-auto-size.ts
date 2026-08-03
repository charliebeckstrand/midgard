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
import type { DensityLevel } from '../../providers/density/context'
import { isDataColumn } from '../../utilities'
import { allocateColumnWidths } from './engine/grid-column/allocate'
import { type ColumnMeasurement, measureColumnIntrinsics } from './engine/grid-column/measure'
import { parsePxWidth } from './engine/grid-table/options'
import type { GridColumn } from './types'

/** Options for {@link useGridColumnAutoSize}. @internal */
type GridColumnAutoSizeOptions<T> = {
	resizable: boolean
	/** When the consumer controls `columnSizing`, the autosizer stands down entirely. */
	controlled: boolean
	table: Table<T>
	/** Visible columns in render order. */
	columns: GridColumn<T>[]
	/** Grid wrapper whose width the columns fill (and which holds the rendered cells). */
	containerRef: RefObject<HTMLElement | null> | undefined
	/**
	 * Fingerprint of the rendered rows (count and end keys), supplied by the
	 * caller from data it already holds: a page turn, filter, or sort that
	 * changes the visible rows re-measures (new content can be wider), without
	 * this hook forcing the engine's Row-per-datum model just to fingerprint a
	 * measurement.
	 */
	rowsSignature: string
	/** Density of the rendered table; a change re-measures (padding and icons scale with it). */
	density: DensityLevel | undefined
	/**
	 * Per-column hard floor (px), written each measurement pass for the drag-resize
	 * bounds and clamp to read — so a manual resize honors the same minimum the
	 * allocator does (a single-word header never truncates). A stable map owned by
	 * the caller; entries merge, so a column held out of a pass keeps its last floor.
	 */
	columnFloors: Map<string, number>
	/**
	 * Freeze the fit against row-data changes (infinite scroll's stable widths): an
	 * appended batch — a rows-only change — no longer re-measures and reflows the
	 * columns; a structural change (columns, density) and a container resize still
	 * re-fit. The initial fit is unaffected.
	 * @defaultValue false
	 */
	freezeOnRowChange?: boolean
	/**
	 * Widths the consumer seeded (a restored/persisted `columnSizing`): their
	 * columns start held at those widths — like a manual resize — so the fit
	 * fills the rest around them instead of measuring over them. Empty (a
	 * first-time grid) leaves every column to auto-fit. Read once at mount.
	 */
	initialSizing?: Record<string, number>
	/**
	 * Set true by the autosizer around its own `setColumnSizing` writes so the
	 * table hook can tell an internal content fit from a user resize and keep the
	 * fit off the consumer's `columnSizing.onValueChange`. Owned by the caller.
	 */
	autoSizingRef?: RefObject<boolean>
}

/** Empty measurement; the resolved value before the first DOM read. @internal */
const EMPTY_MEASUREMENT: ColumnMeasurement = {
	profiles: [],
	fixed: 0,
	floors: new Map(),
	cells: 0,
}

/**
 * The columns a fit measures uncapped: a user-invoked "Auto-size all columns"
 * (`emit`) lifts the runaway-cell cap on every data column — each first gets the
 * smallest width that shows its content whole, before any surplus levels the
 * rest up to fill the grid — while an automatic fit keeps the cap and returns
 * none. @internal
 */
function uncappedColumns<T>(emit: boolean, columns: GridColumn<T>[]): Set<string> | undefined {
	if (!emit) return undefined

	return new Set(columns.filter(isDataColumn).map((col) => String(col.id)))
}

/**
 * Runs an autosizer `setColumnSizing` write. An automatic fit holds
 * `autoSizingRef` true around it, so the table hook's `onColumnSizingChange` —
 * invoked synchronously inside the write — can tell it from a user resize and
 * keep it off the consumer's `columnSizing.onValueChange`. A user-invoked fit
 * (`emit` — "Auto-size all columns") writes unflagged: it is a deliberate width
 * choice, persisted like a drag. @internal
 */
function writeAutoSize(
	ref: RefObject<boolean> | undefined,
	emit: boolean,
	write: () => void,
): void {
	if (!ref || emit) {
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
 * The table's horizontal border chrome (px). Hairline `outline` borders render the
 * table a pixel or two past the summed column widths, which would raise a phantom
 * horizontal scrollbar if the columns filled the full width, so a fit reserves it.
 * Kept out of `run` for its cognitive-complexity budget. @internal
 */
function tableChrome(container: HTMLElement, totalSize: number): number {
	const element = container.querySelector('table')

	if (!element) return 0

	return Math.max(0, Math.round(element.getBoundingClientRect().width - totalSize))
}

/**
 * Whether `next` moves any column off `prev`. A height-only resize tick — or any
 * change landing on the same pixels — must not allocate a fresh sizing object and
 * re-render the head, body, and footer for nothing. Kept out of `run` for its
 * cognitive-complexity budget. @internal
 */
function sizingMoved(prev: Record<string, number>, next: Record<string, number>): boolean {
	for (const id in next) {
		if (prev[id] !== next[id]) return true
	}

	return false
}

/**
 * Auto-sizes a resizable grid's data columns to their content within the
 * container width. Each pass measures the columns' intrinsic widths from the
 * rendered DOM (see {@link measureColumnIntrinsics}) and distributes the
 * available width across them (see {@link allocateColumnWidths}): columns size to
 * their content, a column whose data would truncate gains room while columns that
 * don't need it settle at a shared width, and when the content can't fit the
 * table overflows horizontally rather than shrinking below it. A single-word
 * header never truncates; a multi-word one can.
 *
 * Runs synchronously before paint (so the first frame carries real widths, not
 * the engine's default), again on container resize (`ResizeObserver`), when the
 * columns / density / rendered rows change, and once web fonts settle. It stands
 * down when the consumer controls `columnSizing` or the grid is not resizable.
 *
 * A pass that finds no body cells — a loading skeleton, an empty result, a
 * windowed body whose rows haven't landed — measures no content, so every column
 * falls back to its header floor. That fit is provisional: it is never reused and
 * never frozen, and `fitRenderedRows` re-fits from the body's own layout effect
 * the moment real rows render, before they paint. A grid whose rows arrive after
 * mount therefore shows its content widths in the first frame that shows the
 * content, and holds them from there.
 *
 * A `width`-seeded column holds its explicit width, sitting out the fit while the
 * rest fill around it. The first time the user manually resizes a column — a drag
 * or a keyboard nudge — the grid hands width control to the user: every column is
 * held where it sits (see {@link holdManualWidths}), so a resize stays confined to
 * the one column and never reflows the others, and the table then grows or shrinks
 * freely (trailing space or a horizontal scroll) rather than re-fitting. Auto-fit
 * re-arms only through `sizeToFit` (the "Auto-size all columns" action), which clears
 * every hold and re-fits; `resetColumn` re-fits a single column to its content
 * while the rest stay held.
 *
 * @internal
 */
export function useGridColumnAutoSize<T>({
	resizable,
	controlled,
	table,
	columns,
	containerRef,
	rowsSignature,
	density,
	columnFloors,
	freezeOnRowChange = false,
	initialSizing,
	autoSizingRef,
}: GridColumnAutoSizeOptions<T>): {
	sizeToFit: () => void
	resetColumn: (id: string | number) => void
	holdManualWidths: () => void
	fitRenderedRows: () => void
	/** Whether the first width pass has happened; the table paints once it has. */
	settled: boolean
} {
	const enabled = resizable && !controlled

	// Columns held out of the fit at their current width. A manual resize (drag or
	// keyboard) adds every column here at once, so resizing one never reflows the
	// rest; `sizeToFit` clears the set to re-arm auto-fit. Seeded from any restored
	// `columnSizing` so persisted widths hold on reload instead of being re-fit.
	/**
	 * Whether the first width pass has happened, so the table can be held back until it
	 * has.
	 *
	 * The synchronous fit below already keeps a *client-side* mount from flashing the
	 * engine's default colgroup. A reload is the case it cannot reach: the browser paints
	 * the server's HTML — whose widths are the declared ones, since no measurement has
	 * happened yet — and only then does React hydrate and this fit correct them. That
	 * repaint is the column jump. Nothing can compute a content fit before the DOM
	 * exists, so the fix is to not paint a width that is about to change.
	 *
	 * Flips on the first pass that measures real body cells, not merely the first pass:
	 * a reload arrives with a cold query cache, so the fit at hydration sees only the
	 * header and is provisional by the same test `freezeOnRowChange` uses. The consumer
	 * supplies the escape for a grid that legitimately has no rows to measure.
	 */
	// Seeded from `enabled`, so a grid this hook never sizes is settled on the server too
	// — layout effects don't run there, so a `false` seed would have hidden every
	// non-resizable and consumer-controlled grid until hydration for no reason.
	const [settled, setSettled] = useState(!enabled)

	const manualPinnedRef = useRef<Set<string>>(new Set(Object.keys(initialSizing ?? {})))

	// `width`-seeded columns the user released via "Auto-size all columns"; they rejoin
	// the fit instead of holding their initial `width`. Persists a deliberate
	// release — a drag-hold instead lives in `manualPinnedRef`.
	const widthReleasedRef = useRef<Set<string>>(new Set())

	// Per-column running-max content width, so a wider row paging/scrolling in only
	// grows a column. Cleared when the column set or density changes (structural).
	const runningContentRef = useRef<Map<string, number>>(new Map())

	// The last measurement, reused when only the container width changes.
	const measurementRef = useRef<ColumnMeasurement>(EMPTY_MEASUREMENT)

	// Signature of the inputs that invalidate a measurement; a change clears the
	// running-max cache and forces a fresh DOM read.
	const structSigRef = useRef<string>('')

	// Rendered rows' fingerprint — count and end keys — so a page turn, filter,
	// or sort that changes the visible rows re-measures (new content may be
	// wider). Supplied by the caller (see the option) rather than read off
	// `table.getRowModel()`, which would materialize the engine's row model on
	// every mount of every resizable-by-default grid.
	const rowsSig = rowsSignature

	const structSig = useMemo(
		() => `${columns.map((col) => String(col.id)).join('')}|${density ?? ''}`,
		[columns, density],
	)

	const run = useCallback(
		(forceMeasure: boolean, emit = false) => {
			const container = containerRef?.current

			const width = container?.clientWidth ?? 0

			// No layout (jsdom, display:none, a collapsed panel): leave the columns be;
			// the ResizeObserver's first non-zero tick performs the initial fit. Settle
			// anyway — there is no measurement to wait for, and holding the paint would hide
			// the table for good in an environment that will never report a width.
			if (!enabled || !container || !width) {
				setSettled(true)

				return
			}

			// A drag-resize owns the widths while it's in flight; don't fight it.
			if (table.getState().columnSizingInfo.isResizingColumn) return

			const structChanged = structSigRef.current !== structSig

			if (structChanged) {
				runningContentRef.current.clear()

				structSigRef.current = structSig
			}

			// A pass that read no body cells measured no content (see
			// `ColumnMeasurement.cells`), so it is never reused — the next trigger, even a
			// width-only resize tick, reads the DOM again in case the rows have landed.
			const provisional = measurementRef.current.cells === 0

			if (forceMeasure || structChanged || provisional) {
				measurementRef.current = measureColumnIntrinsics({
					table,
					columns,
					container,
					manualPinned: manualPinnedRef.current,
					released: widthReleasedRef.current,
					runningContent: runningContentRef.current,
					uncapped: uncappedColumns(emit, columns),
				})
			}

			const { profiles, fixed, floors } = measurementRef.current

			// Publish every data column's hard floor — held and `width`-seeded columns
			// included, so a drag-resize and the keyboard bounds honor the same minimum
			// the allocator does (a single-word header stays whole, a multi-word one keeps
			// its icons). Merged, not cleared, so a column dropped from a pass keeps its
			// last floor.
			for (const [id, floor] of floors) columnFloors.set(id, floor)

			// Reserve the table's horizontal border chrome (see `tableChrome`).
			const chrome = tableChrome(container, table.getTotalSize())

			const sizing = allocateColumnWidths(profiles, width - chrome - fixed)

			// Settled only once a pass has read real body cells. A provisional pass — the
			// floor-only fit made against a loading skeleton, before the rows arrive — is
			// the one `freezeOnRowChange` below already refuses to trust, and revealing on
			// it is what still let the columns jump: a reload measures headers, paints, and
			// then re-fits the moment the rows land.
			if (measurementRef.current.cells > 0) setSettled(true)

			// Skip the write when nothing moved (see `sizingMoved`).
			writeAutoSize(autoSizingRef, emit, () =>
				table.setColumnSizing((prev) =>
					sizingMoved(prev, sizing) ? { ...prev, ...sizing } : prev,
				),
			)
		},
		[enabled, table, columns, containerRef, structSig, columnFloors, autoSizingRef],
	)

	// Hand width control to the user: hold every visible data column at its current
	// width so the manual resize that triggered this stays confined to its own
	// column and the rest don't reflow. With every column held the next `run`
	// allocates nothing, so the layout keeps whatever widths it has — the table
	// grows or shrinks freely — until `sizeToFit` clears the holds and re-fits.
	const holdManualWidths = useCallback(() => {
		for (const col of columns) {
			if (isDataColumn(col)) manualPinnedRef.current.add(String(col.id))
		}
	}, [columns])

	// Take manual control once a drag ends, so a drag-resize behaves like a keyboard
	// nudge (see `nudge`, which calls `holdManualWidths` directly): the layout holds
	// where the user left it rather than re-fitting.
	const resizingColumn = table.getState().columnSizingInfo.isResizingColumn

	const lastResizingRef = useRef<string | false>(false)

	useEffect(() => {
		if (typeof resizingColumn === 'string') {
			lastResizingRef.current = resizingColumn
		} else if (lastResizingRef.current) {
			lastResizingRef.current = false

			holdManualWidths()
		}
	}, [resizingColumn, holdManualWidths])

	// Keep the latest `run` reachable from the ResizeObserver without listing it in
	// the observer effect's deps: `run`'s identity shifts whenever the columns,
	// density, or hard floors change, and tearing the observer down to re-subscribe
	// on each of those — and on every row-model change — is needless churn.
	const runRef = useRef(run)

	useLayoutEffect(() => {
		runRef.current = run
	}, [run])

	// Re-measure when the inputs `run` closes over change (columns, density, floors)
	// or the visible rows change (`rowsSig` — a page turn, filter, or sort can bring
	// wider content into view). The observer effect below performs the initial
	// synchronous fit, so the first pass here is skipped.
	const initialFitRef = useRef(false)

	// The struct signature at the last fit, so a rows-only change is told apart from
	// a structural one when the widths are frozen (see `freezeOnRowChange`).
	const fitStructSigRef = useRef(structSig)

	useLayoutEffect(() => {
		if (!enabled) return

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
		// provisional one (see `ColumnMeasurement.cells`): a grid whose rows arrive
		// after mount would otherwise freeze the floor-only fit it made against the
		// loading skeleton and hold every column there for good.
		if (freezeOnRowChange && !structChanged && measurementRef.current.cells > 0) return

		run(true)
	}, [enabled, run, rowsSig, structSig, freezeOnRowChange])

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
		if (!enabled || measurementRef.current.cells > 0) return

		runRef.current(true)
	}, [enabled])

	// Own the ResizeObserver in its own effect, keyed only on enablement and the
	// container, so a width-only container resize is the one thing that recreates it
	// — not a column or row change. Fit synchronously, before paint, so the first
	// frame carries real widths instead of flashing the engine's default colgroup.
	useLayoutEffect(() => {
		const element = containerRef?.current

		// Nothing here will ever size these columns — not resizable, sizing controlled by
		// the consumer, or no `ResizeObserver` (SSR, jsdom). There is nothing to wait for,
		// so let the table paint immediately.
		if (!enabled || !element || typeof ResizeObserver === 'undefined') {
			setSettled(true)

			return
		}

		// Settling is `run`'s to decide, and only on a pass that measured real body cells.
		// A zero-width container (a collapsed panel, a tab parked in a hidden `Activity`)
		// bails inside `run` without settling, and the observer below fits it the moment it
		// has a width — which is the first moment it could be seen anyway.
		runRef.current(true)

		const observer = new ResizeObserver(() => runRef.current(false))

		observer.observe(element)

		return () => observer.disconnect()
	}, [enabled, containerRef])

	useEffect(() => {
		if (!enabled) return

		let cancelled = false

		// Web fonts reflow text after the first measure; re-measure once they settle.
		// Subscribed once per enablement (reading the latest `run` through `runRef`),
		// since `fonts.ready` settles once — re-subscribing on every `run` identity
		// change would re-fire immediately and redundantly.
		document.fonts?.ready
			.then(() => {
				if (cancelled) return

				runningContentRef.current.clear()

				runRef.current(true)
			})
			.catch(() => {})

		return () => {
			cancelled = true
		}
	}, [enabled])

	const sizeToFit = useCallback(() => {
		manualPinnedRef.current.clear()

		// `width` is the initial size; "Auto-size all columns" supersedes it, so release
		// every `width`-seeded hold to redistribute those columns to their content too.
		for (const col of columns) {
			if (parsePxWidth(col.width) != null) widthReleasedRef.current.add(String(col.id))
		}

		runningContentRef.current.clear()

		// A user action: the fitted widths flow to the consumer's `onValueChange`
		// (persisted like a drag), superseding any saved sizing.
		run(true, true)
	}, [run, columns])

	// Reset one column to its content width, leaving the rest held where they are —
	// a reset re-fits the single column, not the grid. Measures with the column
	// treated as auto-sized (so its intrinsic width resolves even while the others
	// are held) and uncapped (a user-invoked fit shows the content whole, past the
	// automatic fit's runaway cap), then holds it at that width; clearing its
	// running max first so the re-measure isn't floored by a stale wider row, and
	// its `width` release so a `width`-seeded column re-measures from content
	// rather than snapping back.
	const resetColumn = useCallback(
		(id: string | number) => {
			const container = containerRef?.current

			const width = container?.clientWidth ?? 0

			if (!enabled || !container || !width) return

			const key = String(id)

			widthReleasedRef.current.delete(key)

			runningContentRef.current.delete(key)

			// Exclude just this column from the hold set for the measure, so it lands in
			// the profiles and its content width is read; the rest stay held.
			const held = new Set(manualPinnedRef.current)

			held.delete(key)

			const { profiles, floors } = measureColumnIntrinsics({
				table,
				columns,
				container,
				manualPinned: held,
				released: widthReleasedRef.current,
				runningContent: runningContentRef.current,
				uncapped: new Set([key]),
			})

			for (const [colId, floor] of floors) columnFloors.set(colId, floor)

			const profile = profiles.find((p) => p.id === key)

			if (!profile) return

			const next = Math.min(Math.max(profile.content, profile.min), profile.max)

			// Hold it at its content width alongside the others.
			manualPinnedRef.current.add(key)

			table.setColumnSizing((prev) => (prev[key] === next ? prev : { ...prev, [key]: next }))
		},
		[enabled, table, columns, containerRef, columnFloors],
	)

	return { sizeToFit, resetColumn, holdManualWidths, fitRenderedRows, settled }
}
