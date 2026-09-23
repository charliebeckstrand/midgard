/**
 * The resize clamp of the dashboard. A tile grows until it meets a neighbour or
 * the edge of the canvas, and it never shrinks under its minimum span. A resize
 * changes the resized tile only; it never pushes a neighbour.
 */

import { type DashboardCell, deriveHeight, fits, sameGeometry } from './dashboard-layout'

/** The edge that a resize handle drives. The corner drives both axes. */
export type DashboardResizeEdge = 'e' | 's' | 'se'

/** The limits of one resize. */
export type DashboardResizeLimits = {
	/** The column count of the canvas. */
	columns: number
	/** The narrowest column span that the content allows. */
	minW: number
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
 * tile cannot change. The width resolves first, then the height, and each axis
 * backs off one unit at a time until the cell fits.
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

	const minW = Math.min(Math.max(1, limits.minW), columns - origin.x)

	const heightAt = (width: number, height: number) =>
		ratio === undefined ? height : deriveHeight(width, ratio)

	let width = Math.min(columns - origin.x, Math.max(minW, Math.round(w)))

	while (
		width > minW &&
		!fits(snapshot, { ...origin, w: width, h: heightAt(width, origin.h) }, columns)
	) {
		width -= 1
	}

	let height = heightAt(width, Math.max(1, Math.round(h)))

	if (ratio === undefined) {
		while (height > 1 && !fits(snapshot, { ...origin, w: width, h: height }, columns)) {
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
