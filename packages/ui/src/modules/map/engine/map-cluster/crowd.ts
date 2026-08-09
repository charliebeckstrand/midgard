/**
 * Which drawn dots keep the pointer target down to what they paint, and why.
 * Clustering has already merged everything that draws over its neighbour
 * (`group.ts`); this reads what survived that merge and asks a wider question of
 * it — not whether two marks overlap, but whether the ground under one of them
 * belongs to something else.
 *
 * Two things claim that ground. A neighbour inside the coarse reach claims it,
 * because a target that covered a neighbour's face would take that neighbour's
 * readout with it and the mark a reader can see would answer nothing. A drawn
 * zone under the dot claims it, which the plat resolves across its whole ledger
 * and hands in as a predicate. {@link fineMarks} is where the two meet, so every
 * dot-shaped mark reads one rule rather than assembling its own.
 *
 * The crowding half reads one mark's own drawn dots — a `MapPoints`'s groups, a
 * `MapMarker`'s pair of pins — rather than every dot on the map. Pooling them
 * would have to happen in the plat, and the plat cannot see the zoom scale every
 * reach here is measured in: `MapZoomScaleContext` sits below it, around the plot
 * alone, precisely so a wheel notch re-renders the marks without re-rendering the
 * plat, its legend, and the region layer. So two separate marks drawn within a
 * target's reach of one another each keep the full target — the bound this pass
 * accepts, and the one place the rule is less than whole.
 *
 * Frame arithmetic over the same grid the clustering passes bucket into
 * (`grid.ts`), and React-free like the rest of the engine.
 */

import { POINT_HIT_RADIUS } from '../map-constants'
import type { MapPoint2D } from '../types'
import { bucket, cellOf, squared, walkNear } from './grid'
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

/**
 * How many marks a pass indexes before the grid pays for itself. Below it the
 * pairwise scan is the cheaper of the two — a `MapPoint` hands in one dot and a
 * `MapMarker` two, which are most of the marks on a map, and neither should
 * allocate a `Map` and probe nine cells to answer a question one subtraction
 * settles.
 *
 * @internal
 */
const INDEX_THRESHOLD = 8

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
 * Past {@link INDEX_THRESHOLD} marks the pass indexes through the shared grid, so
 * a mark reads the nine cells around it rather than every other mark — a set of
 * hundreds would otherwise be a quadratic scan on every regrouping.
 *
 * @param marks - The drawn dots, in the order they draw.
 * @param unitsPerPixel - Frame units per device pixel under the plat's zoom.
 * @returns Whether each dot has a neighbour whose face its coarse target covers.
 *
 * @internal
 */
export function crowdedMarks(marks: readonly MapDotMark[], unitsPerPixel = 1): boolean[] {
	// A mark alone on the frame has no neighbour to swallow, which is every
	// `MapPoint` and every set drawing one dot.
	if (marks.length < 2) return marks.map(() => false)

	if (marks.length <= INDEX_THRESHOLD) return scanned(marks, unitsPerPixel)

	return indexed(marks, unitsPerPixel)
}

/** The pairwise pass, for a set too small for an index to pay for itself. @internal */
function scanned(marks: readonly MapDotMark[], unitsPerPixel: number): boolean[] {
	return marks.map(({ at }, index) => {
		if (at === null) return false

		return marks.some((other, slot) => slot !== index && swallows(at, other, unitsPerPixel))
	})
}

/** The grid-indexed pass, for a set large enough that a pairwise scan is quadratic. @internal */
function indexed(marks: readonly MapDotMark[], unitsPerPixel: number): boolean[] {
	// One cell per widest possible reach, so a mark this one could swallow can only
	// sit in the nine cells around it — the bound `group.ts` runs its own passes on.
	const reach = (POINT_HIT_RADIUS + MAX_CLUSTER_RADIUS) * unitsPerPixel

	const cells = new Map<number, number[]>()

	marks.forEach((mark, index) => {
		if (mark.at !== null) bucket(cells, cellOf(mark.at, reach)).push(index)
	})

	return marks.map(({ at }, index) => {
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

/**
 * Which drawn dots give back the ground a finger-sized target over them would
 * claim: the ones with a neighbour inside that reach, and the ones standing on
 * ground a drawn zone holds. Index for index with the marks handed in, and the
 * one place the two halves meet — a dot-shaped mark passes what it draws and
 * reads the answer, so a mark added later takes the whole rule by construction
 * rather than by memory.
 *
 * @param marks - The drawn dots, in the order they draw.
 * @param unitsPerPixel - Frame units per device pixel under the plat's zoom.
 * @param covered - Whether a drawn zone holds a frame position — the plat's own
 * resolver over its ledger, which answers the legend as it toggles.
 * @returns Whether each dot yields the ground it does not paint.
 *
 * @internal
 */
export function fineMarks(
	marks: readonly MapDotMark[],
	unitsPerPixel: number,
	covered: (at: MapPoint2D) => boolean,
): boolean[] {
	const crowded = crowdedMarks(marks, unitsPerPixel)

	return marks.map(({ at }, index) => {
		if (at === null) return false

		return crowded[index] === true || covered(at)
	})
}
