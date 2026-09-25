/**
 * The resize clamp of the dashboard. A tile grows until it meets a neighbor, the
 * edge of the canvas, or its maximum span, and it never shrinks under its minimum
 * span. A resize changes the resized tile only; it never pushes a neighbor.
 */

import {
	clampSpan,
	type DashboardCell,
	type DashboardTileDemands,
	fits,
	heightAt,
	minColumns,
	sameGeometry,
} from './dashboard-layout'

/** The edge that a resize handle drives. The corner drives both axes. */
export type DashboardResizeEdge = 'e' | 's' | 'se'

/** The limits of one resize. */
export type DashboardResizeLimits = {
	/** The column count of the canvas. */
	columns: number
	/** The narrowest column span: the larger of the `minWidth` floor and `minSize.w`. */
	minW: number
	/** The widest column span, from `maxSize.w`. */
	maxW?: number
	/** The lowest row span, from `minSize.h`. A tile with a fixed ratio ignores it. */
	minH?: number
	/** The highest row span, from `maxSize.h`. A tile with a fixed ratio ignores it. */
	maxH?: number
	/** The fixed ratio of the tile, which makes its height follow its width. */
	ratio?: number
}

/** The measure of the canvas that the width floor of a resize reads. */
export type DashboardResizeMeasure = {
	/** The column count of the canvas. */
	columns: number
	/** The gutter between tiles, in px. */
	gap: number
	/** The column pitch, in px. */
	pitch: number
}

/** The spans that one resize can reach, in grid units. */
export type DashboardResizeRange = {
	/** The narrowest column span. */
	minW: number
	/** The widest column span. */
	maxW: number
	/** The lowest row span. */
	minH: number
	/** The highest row span, or `undefined` when the height has no maximum. */
	maxH?: number
}

/**
 * The narrowest column span that a resize gives a tile with `demand`. It is the
 * larger of `minSize.w` and the span that `minWidth` needs at the pitch.
 */
export function resizeFloor(
	demand: DashboardTileDemands | undefined,
	{ columns, gap, pitch }: DashboardResizeMeasure,
): number {
	const legible =
		demand?.minWidth === undefined ? 1 : minColumns(demand.minWidth, gap, pitch, columns)

	// The legible width in px and the grid-unit minimum both floor the span, so the larger wins.
	return Math.max(legible, demand?.minSize?.w ?? 1)
}

/**
 * The limits of one resize of a tile with `demand`.
 *
 * @param minW - The width floor, from {@link resizeFloor}.
 */
export function resizeLimits(
	demand: DashboardTileDemands | undefined,
	columns: number,
	minW: number,
): DashboardResizeLimits {
	return {
		columns,
		minW,
		maxW: demand?.maxSize?.w,
		minH: demand?.minSize?.h,
		maxH: demand?.maxSize?.h,
		ratio: demand?.ratio,
	}
}

/**
 * The spans that a resize of the tile at column `x` can reach. The width stays
 * inside the right edge, and a minimum wins over a smaller maximum.
 * {@link resizePreview} clamps into this range, and the splitters report it.
 */
export function resizeRange(limits: DashboardResizeLimits, x: number): DashboardResizeRange {
	const room = limits.columns - x

	const minW = Math.min(Math.max(1, limits.minW), room)

	// The height of a tile with a fixed ratio follows its width, so only a
	// free-form tile reads the height limits.
	const free = limits.ratio === undefined

	const minH = free ? Math.max(1, limits.minH ?? 1) : 1

	const maxH = free && limits.maxH !== undefined ? Math.max(minH, limits.maxH) : undefined

	return { minW, maxW: Math.min(room, Math.max(minW, limits.maxW ?? room)), minH, maxH }
}

/** Whether an edge drives the width. */
export function drivesWidth(edge: DashboardResizeEdge): boolean {
	return edge !== 's'
}

/** Whether an edge drives the height. A tile with a fixed ratio has no free height. */
export function drivesHeight(edge: DashboardResizeEdge, ratio: number | undefined): boolean {
	return edge !== 'e' && ratio === undefined
}

/**
 * The cells after the tile `id` resizes toward `w` × `h`, or `null` when the
 * tile cannot change. The width resolves first, then the height. Each axis
 * clamps into its limits, and then it backs off one unit at a time until the cell
 * fits. The width never passes the right edge, even for a larger minimum.
 */
export function resizePreview(
	snapshot: readonly DashboardCell[],
	id: string,
	w: number,
	h: number,
	limits: DashboardResizeLimits,
): DashboardCell[] | null {
	const origin = snapshot.find((cell) => cell.id === id)

	if (origin === undefined || origin.static) return null

	const { columns, ratio } = limits

	const { minW, maxW, minH, maxH } = resizeRange(limits, origin.x)

	let width = clampSpan(Math.round(w), minW, maxW)

	while (
		width > minW &&
		!fits(snapshot, { ...origin, w: width, h: heightAt(width, origin.h, ratio) }, columns)
	) {
		width -= 1
	}

	let height = heightAt(width, clampSpan(Math.round(h), minH, maxH), ratio)

	if (ratio === undefined) {
		while (height > minH && !fits(snapshot, { ...origin, w: width, h: height }, columns)) {
			height -= 1
		}
	}

	const next = { ...origin, w: width, h: height }

	if (!fits(snapshot, next, columns)) return null

	if (next.w === origin.w && next.h === origin.h) return null

	return snapshot.map((cell) => (cell.id === id ? next : cell))
}

/** Whether two previews paint the same board. Two `null` previews are the same. */
export function samePreview(
	a: readonly DashboardCell[] | null,
	b: readonly DashboardCell[] | null,
): boolean {
	if (a === null || b === null) return a === b

	return sameGeometry(a, b)
}
