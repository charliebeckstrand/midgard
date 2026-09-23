import { clamp, isDataColumn } from '../../../../utilities'
import type { GridColumn } from '../../types'
import { DEFAULT_CONTENT_MAX, DEFAULT_MIN_COLUMN_SIZE } from '../grid-constants'
import { isFrozen } from '../grid-pin/overrides'
import { parsePxWidth } from '../grid-table/options'
import { allocateColumnWidths, type ColumnSizeProfile } from './allocate'
import type { ColumnMeasurement } from './measure'

/**
 * Who owns the column widths.
 *
 * - `auto`: the grid owns them. The columns fit their content, and the spare
 *   width lifts the narrow ones, so the table fills its container. Every
 *   trigger fits again.
 * - `manual`: the user owns them. Every held column keeps its width through
 *   every trigger, and the grid spends no container width.
 *
 * @internal
 */
export type GridSizingMode = 'auto' | 'manual'

/**
 * What one sizer command reads. The sizer touches no DOM and no table, so the
 * caller supplies these, and a test can supply fakes.
 *
 * @internal
 */
export type ColumnSizerEnv<T> = {
	/** Visible columns in render order. */
	columns: readonly GridColumn<T>[]
	/**
	 * The width (px) that the auto fill can spend. That is the container, less the
	 * border chrome of the table. Zero spends nothing, which sizes each column to
	 * its content.
	 */
	space: number
	/** The engine's current width (px) of a column. */
	sizeOf: (id: string) => number
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
export type ColumnSizingPersist = 'none' | 'widths' | 'clear'

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
	 * The automatic fit. `fresh` reads the DOM again. Without it, the fit reads
	 * again only when a column lacks a cached fact.
	 */
	refit: <T>(env: ColumnSizerEnv<T>, fresh: boolean) => ColumnSizingWrite
	/** "Auto-size this column": one column to its content width. `null` for a non-data column. */
	sizeColumn: <T>(env: ColumnSizerEnv<T>, id: string) => ColumnSizingWrite | null
	/** "Auto-size all columns": every data column to its content width. */
	sizeAll: <T>(env: ColumnSizerEnv<T>) => ColumnSizingWrite
	/** "Reset column widths": give the widths back to the grid, as on a fresh mount. */
	reset: <T>(env: ColumnSizerEnv<T>) => ColumnSizingWrite
	/** The user resized a column. Hold every visible data column where it sits. */
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
 * `minWidth` and `maxWidth`. `body` is the widest body cell. A `capped` read
 * holds a width-less column at {@link DEFAULT_CONTENT_MAX}, so that one long
 * cell cannot take the whole table in the automatic fit. A `maxWidth` is the
 * cap when the column sets one.
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
 * The width (px) that a column keeps while it sits out the fit. A seeded column
 * that nobody held or released keeps its seed. Every other column keeps its
 * engine width.
 *
 * @internal
 */
function keptWidth<T>(
	col: GridColumn<T>,
	env: ColumnSizerEnv<T>,
	holds: ReadonlySet<string>,
	released: ReadonlySet<string>,
): number {
	const id = String(col.id)

	const seed = parsePxWidth(col.width)

	if (seed == null || !isDataColumn(col) || holds.has(id) || released.has(id)) {
		return env.sizeOf(id)
	}

	return clamp(seed, col.minWidth ?? 0, col.maxWidth ?? Number.MAX_SAFE_INTEGER)
}

/**
 * Builds a {@link GridColumnSizer}. These are its rules:
 *
 * 1. One content width. {@link contentWidth} sizes a column for every path: the
 *    automatic fit, each auto-size action, and a column that appears later.
 * 2. Two modes (see {@link GridSizingMode}). A grid mounts in `auto`, or in
 *    `manual` when it mounts with saved widths.
 * 3. A user width change takes control. A drag, a keyboard nudge, and both
 *    auto-size actions hold every visible data column and set `manual`.
 * 4. The auto-size actions agree. "Auto-size all columns" gives each column the
 *    width that "Auto-size this column" gives it. Neither action spends spare
 *    width, and neither caps the content.
 * 5. A reset gives the widths back to the grid. It clears every hold and every
 *    released seed, and it is equal to a fresh mount with no saved widths.
 * 6. The cache holds facts, not decisions. Each pass decides again from the
 *    current holds which columns join the fit. A cached fact therefore stays
 *    true after a hold changes.
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

	// Whether the last measurement read body cells (see `ColumnMeasurement.cells`).
	let seen = false

	function read<T>(env: ColumnSizerEnv<T>, scan: ReadonlySet<string>): void {
		const measurement = env.measure(scan)

		for (const [id, floor] of measurement.floors) floors.set(id, floor)

		for (const [id, body] of measurement.bodies) {
			widest.set(id, Math.max(widest.get(id) ?? 0, body))
		}

		seen = measurement.cells > 0
	}

	function floorOf<T>(col: GridColumn<T>): number {
		return floors.get(String(col.id)) ?? col.minWidth ?? DEFAULT_MIN_COLUMN_SIZE
	}

	function profileOf<T>(col: GridColumn<T>): ColumnSizeProfile {
		const id = String(col.id)

		const floor = floorOf(col)

		return {
			id,
			min: floor,
			content: contentWidth(col, floor, widest.get(id) ?? 0, true),
			max: col.maxWidth ?? Number.MAX_SAFE_INTEGER,
			frozen: isFrozen(col),
		}
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
				contentWidth(col, floorOf(col), widest.get(String(col.id)) ?? 0, false),
			]),
		)
	}

	function refit<T>(env: ColumnSizerEnv<T>, fresh: boolean): ColumnSizingWrite {
		const joined = env.columns.filter((col) => isAutoSized(col, holds, released))

		const unfloored = env.columns.some((col) => isDataColumn(col) && !floors.has(String(col.id)))

		// A held column needs no content, so a grid whose every column is held reads
		// again only for a missing floor or a provisional pass.
		const stale = (fresh && joined.length > 0) || !seen || unfloored

		const ids = new Set(joined.map((col) => String(col.id)))

		if (stale) read(env, ids)

		let kept = 0

		for (const col of env.columns) {
			if (!ids.has(String(col.id))) kept += keptWidth(col, env, holds, released)
		}

		const space = mode === 'auto' ? Math.max(0, env.space - kept) : 0

		return {
			sizing: allocateColumnWidths(joined.map(profileOf), space),
			replace: false,
			persist: 'none',
		}
	}

	return {
		mode: () => mode,
		measured: () => seen,
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
		reset: (env) => {
			mode = 'auto'

			holds.clear()

			released.clear()

			widest.clear()

			return { sizing: refit(env, true).sizing, replace: true, persist: 'clear' }
		},
		takeControl,
		forget: () => {
			widest.clear()

			seen = false
		},
	}
}
