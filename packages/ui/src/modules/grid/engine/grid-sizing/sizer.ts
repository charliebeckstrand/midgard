import { clamp, isDataColumn } from '../../../../utilities'
import type { GridColumn } from '../../types'
import { DEFAULT_CONTENT_MAX, DEFAULT_MIN_COLUMN_SIZE } from '../grid-constants'
import { sameNumberMap } from '../grid-table/equality'
import { parsePxWidth } from '../grid-table/resize-view'
import { type ColumnMeasurement, isContentSized } from './measure'

/**
 * Who owns the column widths.
 *
 * - `auto`: the browser owns them. The table keeps the automatic table layout,
 *   which lays the columns out to their content and spreads the spare width, so
 *   the table fills its container. The grid reads the widths and sets none.
 * - `manual`: the user owns them. The table takes the fixed layout. Every held
 *   column keeps its width through every trigger, and the grid spends no
 *   container width.
 *
 * @internal
 */
type GridSizingMode = 'auto' | 'manual'

/**
 * What one sizer command reads. The sizer touches no DOM and no table, so the
 * caller supplies these, and a test can supply fakes.
 *
 * @internal
 */
export type ColumnSizerEnv<T> = {
	/** Visible columns in render order. */
	columns: readonly GridColumn<T>[]
	/** The engine's current width (px) of a column. */
	getSize: (id: string) => number
	/** Reads the DOM facts for the columns in `scan` (see {@link measureColumns}). */
	measure: (scan: ReadonlySet<string>) => ColumnMeasurement
}

/**
 * What a write tells the consumer's `columnSizing.onValueChange`.
 *
 * - `none`: an automatic fit. The binding does not fire, because a fit is not a
 *   preference.
 * - `widths`: a user choice. The binding fires with the written widths.
 * - `clear`: the user gave the widths back to the grid. The binding fires with
 *   `{}`, so a reload restores the auto layout.
 *
 * @internal
 */
type ColumnSizingPersist = 'none' | 'widths' | 'clear'

/** A write that a sizer command asks for. @internal */
export type ColumnSizingWrite = {
	/** Widths (px) to write, keyed by column id. */
	sizing: Record<string, number>
	/** Replace the whole sizing state instead of a merge into it. A reset drops every held width. */
	replace: boolean
	persist: ColumnSizingPersist
}

/**
 * The column-width state machine of a resizable grid. See
 * {@link createColumnSizer} for the rules that it applies.
 *
 * @internal
 */
export type GridColumnSizer = {
	/** Who owns the widths now. */
	mode: () => GridSizingMode
	/**
	 * Whether the last measurement read body cells. A pass that read none is
	 * provisional, so the next pass measures again.
	 */
	measured: () => boolean
	/**
	 * The least width (px) of each column that the browser sizes in `auto` mode,
	 * by column id. The map keeps its identity until a pass changes it. See
	 * {@link createColumnSizer}, rule 1.
	 */
	least: () => ReadonlyMap<string, number>
	/**
	 * The pass of `auto` mode: reads the header floors and the content of the
	 * rendered rows into the least widths. `replace` reads the least widths
	 * again, and drops the widths of rows that left. Without it, a least width
	 * only grows.
	 */
	observe: <T>(env: ColumnSizerEnv<T>, replace: boolean) => void
	/**
	 * The pass of the fixed layout (`manual` mode, or controlled widths): sizes
	 * each content-sized column, and each data column without a hold. `fresh`
	 * reads the DOM again. Without it, the pass reads again only when a column
	 * lacks a cached fact.
	 */
	refit: <T>(env: ColumnSizerEnv<T>, fresh: boolean) => ColumnSizingWrite
	/** "Auto-size this column": one column to its content width. `null` for a non-data column. */
	sizeColumn: <T>(env: ColumnSizerEnv<T>, id: string) => ColumnSizingWrite | null
	/** "Auto-size all columns": every data column to its content width. */
	sizeAll: <T>(env: ColumnSizerEnv<T>) => ColumnSizingWrite
	/** "Reset column widths": give the widths back to the browser, as on a fresh mount. */
	reset: () => ColumnSizingWrite
	/** The user resized a column. Hold every visible data column where it sits, in `manual` mode. */
	takeControl: <T>(columns: readonly GridColumn<T>[]) => void
	/** Drop the cached content widths, after a density, column, or font change. */
	forget: () => void
}

/**
 * Whether a column joins the fit. A non-data column never joins. A held column
 * keeps its width. A `width`-seeded column keeps its seed until the user
 * releases it with an auto-size action.
 *
 * @internal
 */
export function isAutoSized<T>(
	col: GridColumn<T>,
	holds: ReadonlySet<string>,
	released: ReadonlySet<string>,
): boolean {
	if (!isDataColumn(col)) return false

	const id = String(col.id)

	if (holds.has(id)) return false

	return parsePxWidth(col.width) == null || released.has(id)
}

/**
 * The content width (px) of a column. That is the smallest width that shows
 * its header and every measured body cell without truncation. Every sizing path
 * reads it from this one function.
 *
 * `floor` is the header floor (see {@link measureColumns}), already inside
 * `minWidth` and `maxWidth`. `body` is the widest body cell, or the header with
 * its title in full when that is wider (see `ColumnMeasurement.titles`). A
 * `capped` read holds a width-less column at {@link DEFAULT_CONTENT_MAX}, so
 * that one long cell cannot take the whole table in the automatic fit. A
 * `maxWidth` is the cap when the column sets one.
 *
 * @internal
 */
export function contentWidth<T>(
	col: GridColumn<T>,
	floor: number,
	body: number,
	capped: boolean,
): number {
	const cap = col.maxWidth ?? (capped ? DEFAULT_CONTENT_MAX : Number.MAX_SAFE_INTEGER)

	return Math.max(floor, Math.min(body, cap))
}

/**
 * The width (px) that a column keeps in the automatic table layout, or
 * `undefined` when the browser sizes it from its content: the `width` seed of a
 * data column, inside its bounds, or the `width` of a non-data column. A
 * content-sized column takes the width of its content (see
 * {@link isContentSized}).
 *
 * @internal
 */
export function fitKeptWidth<T>(col: GridColumn<T>): number | undefined {
	const seed = parsePxWidth(col.width)

	if (seed == null || !isDataColumn(col)) return seed

	return clamp(seed, col.minWidth ?? 0, col.maxWidth ?? Number.MAX_SAFE_INTEGER)
}

/**
 * Builds a {@link GridColumnSizer}. These are its rules:
 *
 * 1. The browser sizes `auto` mode. The table keeps the automatic table layout,
 *    on the server and in each render, so hydration and a container resize move
 *    no column that the browser did not move. Each pass reads the content of
 *    the rendered rows into a least width for each column. A header cell takes
 *    its least width as its `min-width`, and the body content then sizes no
 *    column (see `k.fit.held`). A wider row that pages in grows its column, and
 *    a row that leaves does not shrink it. A windowed body scrolls without a
 *    pass, so its columns hold. The first pass reads the uncontained layout, so
 *    a least width is never more than the width that the browser gave its
 *    column. Each least width is then the width that the browser laid out, and
 *    the held layout paints the same pixels.
 * 2. Two modes (see {@link GridSizingMode}). A grid mounts in `auto`, or in
 *    `manual` when it mounts with saved widths.
 * 3. A user width change takes control. A drag, a keyboard nudge, and both
 *    auto-size actions hold every visible data column at the width that it
 *    shows, and set `manual`.
 * 4. The auto-size actions agree. "Auto-size all columns" gives each column the
 *    width that "Auto-size this column" gives it. Neither action spends spare
 *    width, and neither caps the content. {@link contentWidth} sizes each one.
 * 5. A reset gives the widths back to the grid. It clears every hold, every
 *    released seed, and every least width, and it is equal to a fresh mount
 *    with no saved widths.
 * 6. The cache holds facts, not decisions. Each pass decides again from the
 *    current holds which columns it sizes. A cached fact therefore stays true
 *    after a hold changes.
 * 7. A content-sized column (see {@link isContentSized}) takes its content width
 *    in every mode. It never takes spare width, and no hold or action reaches it.
 *
 * In `manual` mode, a data column without a hold sizes to its content. That is
 * a column that the user shows after the hold, or one that the saved widths do
 * not name. The spare width stays empty, as it does after a drag.
 *
 * @param floors - The shared map of header floors. The sizer merges each
 * measurement into it, and the drag bounds read it.
 * @param seeded - The column ids of the saved widths the grid mounts with. They
 * start held, in `manual` mode.
 * @internal
 */
export function createColumnSizer({
	floors,
	seeded,
}: {
	floors: Map<string, number>
	seeded: readonly string[]
}): GridColumnSizer {
	let mode: GridSizingMode = seeded.length > 0 ? 'manual' : 'auto'

	// Columns that keep their width through every fit.
	const holds = new Set<string>(seeded)

	// `width`-seeded columns that an auto-size action released into the fit.
	const released = new Set<string>()

	// The running maximum of each column's widest body cell (px, uncapped). A wider
	// row that pages or scrolls in only grows a column, so the widths do not jitter.
	const widest = new Map<string, number>()

	// The least width (px) of each column that the browser sizes (see rule 1). A new
	// map for each change, so the hook can render from it.
	let least: ReadonlyMap<string, number> = new Map()

	// The running maximum of each content-sized column's width (px), with the same
	// grow-only rule as `widest`.
	const fits = new Map<string, number>()

	// The width (px) that each data header needs to show its title in full. Like a
	// floor, it is a header fact, so each pass sets it again.
	const titles = new Map<string, number>()

	// Whether the last measurement read body cells (see `ColumnMeasurement.cells`).
	let seen = false

	function read<T>(env: ColumnSizerEnv<T>, scan: ReadonlySet<string>): ColumnMeasurement {
		const measurement = env.measure(scan)

		for (const [id, floor] of measurement.floors) floors.set(id, floor)

		for (const [id, title] of measurement.titles) titles.set(id, title)

		for (const [id, body] of measurement.bodies) {
			widest.set(id, Math.max(widest.get(id) ?? 0, body))
		}

		for (const [id, width] of measurement.fits) fits.set(id, Math.max(fits.get(id) ?? 0, width))

		seen = measurement.cells > 0

		return measurement
	}

	function getFloor<T>(col: GridColumn<T>): number {
		return floors.get(String(col.id)) ?? col.minWidth ?? DEFAULT_MIN_COLUMN_SIZE
	}

	// The widest content (px) of a data column: its widest body cell so far, or its
	// header with the title in full. A column that rendered no body cell (an empty
	// result, a loading skeleton) still has its header.
	function widestContent<T>(col: GridColumn<T>): number {
		const id = String(col.id)

		return Math.max(widest.get(id) ?? 0, titles.get(id) ?? 0)
	}

	// The width (px) of a data column that sizes to its content without the fill:
	// the content width of its widest row so far, inside its floor and its cap.
	function desiredWidth<T>(col: GridColumn<T>): number {
		return contentWidth(col, getFloor(col), widestContent(col), true)
	}

	// The least widths of a pass (see rule 1). A column that the browser sized from
	// its content (`bound`) takes no more than the width that it shows. Without
	// `replace`, a least width only grows.
	function holdContent(measurement: ColumnMeasurement, bound: boolean, replace: boolean): void {
		const next = new Map(replace ? [] : least)

		for (const [id, need] of measurement.leaves) {
			const shown = bound ? (measurement.rendered.get(id) ?? need) : need

			next.set(id, Math.max(next.get(id) ?? 0, Math.min(need, shown)))
		}

		if (!sameNumberMap(least, next)) least = next
	}

	function takeControl<T>(columns: readonly GridColumn<T>[]): void {
		mode = 'manual'

		for (const col of columns) {
			if (isDataColumn(col)) holds.add(String(col.id))
		}
	}

	// A fresh content width for each column in `cols`: its running maximum drops
	// first, so a wider row that has left the view no longer holds it wide.
	function freshContent<T>(
		env: ColumnSizerEnv<T>,
		cols: readonly GridColumn<T>[],
	): Record<string, number> {
		const ids = new Set(cols.map((col) => String(col.id)))

		for (const id of ids) widest.delete(id)

		read(env, ids)

		return Object.fromEntries(
			cols.map((col) => [
				String(col.id),
				contentWidth(col, getFloor(col), widestContent(col), false),
			]),
		)
	}

	// Whether a column lacks the fact that a pass reads for it: the floor of a data
	// column, or the width of a content-sized one.
	function lacksFact<T>(col: GridColumn<T>): boolean {
		const id = String(col.id)

		if (isDataColumn(col)) return !floors.has(id)

		return isContentSized(col) && !fits.has(id)
	}

	// Each content-sized column takes its content width, and none of the spare width.
	// A column that no pass has measured yet keeps its engine width.
	function contentWidths<T>(cols: readonly GridColumn<T>[]): Record<string, number> {
		const content: Record<string, number> = {}

		for (const col of cols) {
			const width = fits.get(String(col.id))

			if (width != null) content[String(col.id)] = width
		}

		return content
	}

	function refit<T>(env: ColumnSizerEnv<T>, fresh: boolean): ColumnSizingWrite {
		const joined = env.columns.filter((col) => isAutoSized(col, holds, released))

		const fitted = env.columns.filter(isContentSized)

		const unfloored = env.columns.some(lacksFact)

		// A held column needs no content, so a grid whose every column is held reads
		// again only for a missing fact or a provisional pass. A content-sized column
		// is never held.
		const stale = (fresh && (joined.length > 0 || fitted.length > 0)) || !seen || unfloored

		if (stale) read(env, new Set(joined.map((col) => String(col.id))))

		// The fixed layout spends no spare width: each column without a hold takes the
		// width of its content, as it does after a drag.
		const sizing = contentWidths(fitted)

		for (const col of joined) sizing[String(col.id)] = desiredWidth(col)

		return { sizing, replace: false, persist: 'none' }
	}

	function observe<T>(env: ColumnSizerEnv<T>, replace: boolean): void {
		const ids = env.columns
			.filter((col) => isAutoSized(col, holds, released))
			.map((col) => String(col.id))

		const measurement = read(env, new Set(ids))

		// A pass that read no row (a skeleton, an empty result) keeps the least widths.
		if (measurement.cells === 0) return

		// With no least width, the body content sizes the columns, so the widths on the
		// screen bound the content.
		holdContent(measurement, least.size === 0, replace)
	}

	return {
		mode: () => mode,
		measured: () => seen,
		least: () => least,
		observe,
		refit,
		sizeColumn: (env, id) => {
			const col = env.columns.find((candidate) => String(candidate.id) === id)

			if (!col || !isDataColumn(col)) return null

			takeControl(env.columns)

			released.add(id)

			return { sizing: freshContent(env, [col]), replace: false, persist: 'widths' }
		},
		sizeAll: (env) => {
			const cols = env.columns.filter(isDataColumn)

			takeControl(env.columns)

			for (const col of cols) released.add(String(col.id))

			return { sizing: freshContent(env, cols), replace: false, persist: 'widths' }
		},
		reset: () => {
			mode = 'auto'

			holds.clear()

			released.clear()

			widest.clear()

			fits.clear()

			least = new Map()

			seen = false

			// The browser sizes the columns again, so the sizing state holds no width.
			return { sizing: {}, replace: true, persist: 'clear' }
		},
		takeControl,
		forget: () => {
			widest.clear()

			fits.clear()

			seen = false
		},
	}
}
