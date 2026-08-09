/**
 * Which drawn dots stand close enough that a finger-sized target over one would
 * swallow another. Clustering has already merged everything that draws over its
 * neighbour (`group.ts`); this reads what survived that merge and asks a wider
 * question of it — not whether two marks overlap, but whether one mark's coarse
 * reach covers the face of another.
 *
 * The answer is what lets a dot hold the fine pointer target where it has
 * neighbours and take the full one where it stands alone: a target that covered a
 * neighbour's face would take that neighbour's readout with it, and the mark a
 * reader can see would answer nothing.
 *
 * Frame arithmetic over the same grid the clustering passes bucket into
 * (`grid.ts`), and React-free like the rest of the engine.
 */

import { POINT_HIT_RADIUS } from '../map-constants'
import type { MapPoint2D } from '../types'
import { bucket, cellOf, walkNear } from './grid'
import { MAX_CLUSTER_RADIUS } from './radius'

/**
 * One drawn dot the pass measures: where it draws in frame units, and the radius
 * it paints at in device pixels — a lone dot's, a summary's grade, a pin's.
 * `null` where the projection has no image for it, which draws nothing and
 * crowds nothing.
 *
 * @internal
 */
export type MapDotMark = {
	at: MapPoint2D | null
	radius: number
}

/** The squared distance between two frame points, so a comparison takes no square root. @internal */
function squared(a: MapPoint2D, b: MapPoint2D): number {
	const dx = a.x - b.x

	const dy = a.y - b.y

	return dx * dx + dy * dy
}

/**
 * Whether a coarse target centred on `mark` would cover the face `other` paints.
 * Read one way round rather than as an overlap: the mark whose target covers a
 * neighbour is the one that has to give the ground back, and a wide summary
 * beside a small dot is not the same case as the small dot beside it.
 *
 * @internal
 */
function swallows(mark: MapPoint2D, other: MapDotMark, unitsPerPixel: number): boolean {
	if (other.at === null) return false

	const reach = (POINT_HIT_RADIUS + other.radius) * unitsPerPixel

	return squared(mark, other.at) < reach * reach
}

/**
 * Which of the drawn dots have a neighbour inside their coarse reach, index for
 * index with the marks handed in.
 *
 * `unitsPerPixel` is what one device pixel spans in frame units — `1` at rest,
 * and `1 / k` under the zoom layer's transform. Every reach here is a pixel
 * measure and every position is a frame one, so the conversion lands once, on the
 * way into {@link swallows}. A zoom that spreads the dots apart on screen frees
 * their targets on the same beat it separates a summary into its own dots, which
 * is the beat those dots need aiming at.
 *
 * Indexed through the shared grid at one cell per widest possible reach, so a
 * mark reads the nine cells around it rather than every other mark — the set this
 * runs over is the drawn one, which on a national frame is hundreds of dots and
 * on every hover crossing would otherwise be a quadratic scan.
 *
 * @param marks - The drawn dots, in the order they draw.
 * @param unitsPerPixel - Frame units per device pixel under the plat's zoom.
 * @returns Whether each dot has a neighbour whose face its coarse target covers.
 *
 * @internal
 */
export function crowdedMarks(marks: readonly MapDotMark[], unitsPerPixel = 1): boolean[] {
	// A mark alone on the frame has no neighbour to swallow, and a `MapPoint` is
	// always this case — so the singular marks never build an index at all.
	if (marks.length < 2) return marks.map(() => false)

	const reach = (POINT_HIT_RADIUS + MAX_CLUSTER_RADIUS) * unitsPerPixel

	const cells = new Map<number, number[]>()

	marks.forEach((mark, index) => {
		if (mark.at !== null) bucket(cells, cellOf(mark.at, reach)).push(index)
	})

	return marks.map((mark, index) => {
		const at = mark.at

		if (at === null) return false

		let crowded = false

		walkNear(cells, at, reach, (slot) => {
			// Its own entry answers itself, and a dot is never its own neighbour.
			if (slot === index) return false

			const other = marks[slot]

			crowded = other !== undefined && swallows(at, other, unitsPerPixel)

			return crowded
		})

		return crowded
	})
}
