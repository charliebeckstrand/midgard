/**
 * The resize clamp of the dashboard. A tile grows until it meets a neighbor, the
 * edge of the canvas, or its maximum span, and it never shrinks under its minimum
 * span. A resize changes the resized tile only; it never pushes a neighbor.
 */

import { clampSpan, type DashboardCell, deriveHeight, fits, sameGeometry } from './dashboard-layout'

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

	const room = columns - origin.x

	const minW = Math.min(Math.max(1, limits.minW), room)

	// The height of a tile with a fixed ratio follows its width, so only a
	// free-form tile reads the height limits.
	const minH = ratio === undefined ? Math.max(1, limits.minH ?? 1) : 1

	const maxH = ratio === undefined ? limits.maxH : undefined

	const heightAt = (width: number, height: number) =>
		ratio === undefined ? height : deriveHeight(width, ratio)

	let width = Math.min(room, clampSpan(Math.round(w), minW, limits.maxW))

	while (
		width > minW &&
		!fits(snapshot, { ...origin, w: width, h: heightAt(width, origin.h) }, columns)
	) {
		width -= 1
	}

	let height = heightAt(width, clampSpan(Math.round(h), minH, maxH))

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
