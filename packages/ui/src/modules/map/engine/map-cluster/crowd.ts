/**
 * How far each drawn dot's pointer target reaches, and why it is ever less than
 * the whole. Clustering has already merged everything that draws over its
 * neighbor (`group.ts`). This reads what survived that merge, and asks a wider
 * question of it. The question is not whether two marks overlap, but how much of
 * the ground under one of them belongs to something else.
 *
 * Three things claim that ground. They are a neighbor inside the coarse reach,
 * a drawn zone under the dot, and a region layer that answers the pointer. A
 * region layer answers through a readout, a pick, or a menu. A target that
 * covers the face of a neighbor takes the readout of that neighbor, and the mark
 * that a reader can see answers nothing. The dot is the topmost thing at its own
 * pixels, so a 44px target over a zone or a region hides that shape.
 *
 * The zone claim and the region claim arrive folded into the one budget that
 * the plat hands in. The zone half comes off its ledger, and the region half off
 * the geography under the dot. Both are spelled as a reach, so a new claimant
 * needs nothing new from this pass. {@link markTargets} is where the claims
 * meet, so every dot-shaped mark reads one rule rather than its own.
 *
 * The crowding half reads the drawn dots that one pass hands in. A `MapMarker`
 * hands in its pair of pins. The point sets of a plat hand in the marks of their
 * shared pass (`sets.ts`), which holds every set that clusters. Thus a dot gives
 * way to the dots of the other sets too. Any other pair of separate marks within
 * the reach of a target keeps the full radius here.
 *
 * The plat cannot pool those marks, because it cannot see the zoom scale that
 * each reach here is measured in. `MapZoomScaleContext` sits below it, around
 * the plot alone. A wheel notch therefore re-renders the marks without a render
 * of the plat, its legend, and the region layer. That is the bound this pass
 * accepts.
 *
 * `ground.ts` answers instead: it divides what the two targets overlap, and it
 * shrinks neither. It can pool across marks, because it measures in frame units,
 * and a frame position is scale-free where a reach is not. `MapPoint` and
 * `MapMarker` read it. `MapPoints` does not yet, because one clip for each dot
 * of a set is a cost that the ROADMAP holds open.
 *
 * Frame arithmetic over the same grid the clustering passes bucket into
 * (`grid.ts`), and React-free like the rest of the engine.
 */

import { clamp } from '../../../../utilities/clamp'
import { POINT_HIT_RADIUS } from '../map-constants'
import type { MapPoint2D } from '../types'
import { bucket, squared, toCellKey, walkNear } from './grid'

/**
 * One drawn dot the pass measures: where it draws in frame units, and the radius
 * it paints at in device pixels. That radius is a lone dot's, a summary's grade,
 * or a pin's. `null` where the projection has no image for it, which draws
 * nothing and crowds nothing.
 *
 * @internal
 */
export type MapDotMark = {
	at: MapPoint2D | null
	radius: number
}

/**
 * How many marks a pass indexes before the grid pays for itself. Below it the
 * pairwise scan is the cheaper of the two. A `MapPoint` hands in one dot and a
 * `MapMarker` two, which are most of the marks on a map. Neither needs to
 * allocate a `Map` and probe nine cells to answer a question one subtraction
 * settles.
 *
 * @internal
 */
const INDEX_THRESHOLD = 8

/**
 * How much reach a target centered on `mark` has before it covers the face
 * `other` paints, in device pixels. It is the gap between them less what the
 * neighbor draws. It is read one way round, rather than as an overlap. The mark
 * whose target reaches a neighbor is the one that gives ground back. A wide
 * summary beside a small dot is not the same case as the small dot beside it.
 *
 * `Infinity` where the neighbor is beyond that reach anyway. That is the
 * identity of the minimum a caller folds these into. A far neighbor therefore
 * needs no special case, and no layer below {@link markTargets} has to know what
 * the cap is.
 *
 * @internal
 */
function roomBeside(mark: MapPoint2D, other: MapDotMark, unitsPerPixel: number): number {
	if (other.at === null) return Number.POSITIVE_INFINITY

	const reach = (POINT_HIT_RADIUS + other.radius) * unitsPerPixel

	const apart = squared(mark, other.at)

	// The square root is paid only by the pairs that decide something; the far ones
	// answer off the squared compare, which is what `group.ts` buckets for.
	if (apart >= reach * reach) return Number.POSITIVE_INFINITY

	return Math.sqrt(apart) / unitsPerPixel - other.radius
}

/**
 * How much reach the nearest neighbor leaves each drawn dot, index for index
 * with the marks handed in. It is `Infinity` where nothing stands inside that
 * dot's coarse reach, which {@link markTargets} then caps.
 *
 * `unitsPerPixel` is what one device pixel spans in frame units: `1` at rest,
 * and `1 / k` under the zoom layer's transform. Every reach here is a pixel
 * measure and every position is a frame one, so the conversion lands once, on the
 * way into {@link roomBeside}. A zoom that spreads the dots apart on screen frees
 * their targets on the same beat it separates a summary into its own dots. That
 * is the beat those dots need aiming at.
 *
 * Past {@link INDEX_THRESHOLD} marks the pass indexes through the shared grid. A
 * mark therefore reads the nine cells around it, rather than every other mark. A
 * set of hundreds would otherwise be a quadratic scan on every regrouping.
 *
 * @param marks - The drawn dots, in the order they draw.
 * @param unitsPerPixel - Frame units per device pixel under the plat's zoom.
 * @returns The reach each dot's neighbors leave it, in device pixels.
 *
 * @internal
 */
export function neighborRoom(marks: readonly MapDotMark[], unitsPerPixel = 1): number[] {
	// A mark alone on the frame has no neighbor to give ground to, which is every
	// `MapPoint` and every set drawing one dot.
	if (marks.length < 2) return marks.map(() => Number.POSITIVE_INFINITY)

	if (marks.length <= INDEX_THRESHOLD) return scanned(marks, unitsPerPixel)

	return indexed(marks, unitsPerPixel)
}

/** The pairwise pass, for a set too small for an index to pay for itself. @internal */
function scanned(marks: readonly MapDotMark[], unitsPerPixel: number): number[] {
	return marks.map(({ at }, index) => {
		if (at === null) return Number.POSITIVE_INFINITY

		let room = Number.POSITIVE_INFINITY

		for (const [slot, other] of marks.entries()) {
			if (slot !== index) room = Math.min(room, roomBeside(at, other, unitsPerPixel))
		}

		return room
	})
}

/** The grid-indexed pass, for a set large enough that a pairwise scan is quadratic. @internal */
function indexed(marks: readonly MapDotMark[], unitsPerPixel: number): number[] {
	// One cell per widest possible reach, so a mark this one could swallow can only
	// sit in the nine cells around it: the bound `group.ts` runs its own passes on.
	// The widest mark in the set sets it, since a summary grows with its count.
	const widest = marks.reduce((most, mark) => Math.max(most, mark.radius), 0)

	const reach = (POINT_HIT_RADIUS + widest) * unitsPerPixel

	const cells = new Map<number, number[]>()

	marks.forEach((mark, index) => {
		if (mark.at !== null) bucket(cells, toCellKey(mark.at, reach)).push(index)
	})

	return marks.map(({ at }, index) => {
		if (at === null) return Number.POSITIVE_INFINITY

		let room = Number.POSITIVE_INFINITY

		walkNear(cells, at, reach, (slot) => {
			// Its own entry answers itself, and a dot is never its own neighbor.
			const other = slot === index ? undefined : marks[slot]

			if (other !== undefined) room = Math.min(room, roomBeside(at, other, unitsPerPixel))

			// Never stops the walk, where `group.ts` reads this return to stop on its
			// first hit: the nearest neighbor decides the reach, so every near cell has
			// to be read before the answer is known.
			return false
		})

		return room
	})
}

/**
 * The radius each drawn dot's pointer target takes, in device pixels, index for
 * index with the marks handed in. It is the one place every claim on that ground
 * meets.
 *
 * A dot takes the whole finger target where nothing else needs the ground under
 * it, and gives way as something does. That something is a neighbor close
 * enough that the target would cover its face. It is also a zone or region it
 * stands on, with only so much room to spare. All three arrive as the same
 * measure: a reach in device pixels, `Infinity` where the claimant wants
 * nothing. The answer is therefore their minimum, clamped between what the dot
 * paints and the reach a finger takes.
 *
 * A target narrower than its own dot leaves the dot a dead rim. A target wider
 * than the finger target is reach that no pointer asked for. A summary wide
 * enough to hold a long count can paint past the finger target, and then the
 * floor wins: the target is the dot.
 *
 * This is the one place {@link POINT_HIT_RADIUS} means the cap. Every producer
 * below it spells "I claim nothing" as the identity of the minimum instead. A
 * third claimant added later therefore needs to know only its own measure.
 *
 * A measure rather than a pair of booleans. A test of whether a dot stands
 * inside a zone has no answer on the boundary. A zone drawn through its own
 * marks puts every one of them exactly there. There, the winding and the
 * concavity of the ring decide a ray cast. A measure of the room has an answer
 * everywhere, and the answer is the same for every dot on one zone. Thus the
 * four corners of one corridor all point alike.
 *
 * @param marks - The drawn dots, in the order they draw.
 * @param unitsPerPixel - Frame units per device pixel under the plat's zoom.
 * @param spare - How much reach the drawn zones and the region layer leave a mark
 * at a position. It is the plat's own resolver over its ledger, which answers the
 * legend as it toggles. It is already bound to the scale by `useMapOverlay`.
 * @param beside - How much reach the neighbors leave each dot, index for index
 * with `marks`. Omitted, it is {@link neighborRoom} over `marks`. The point sets
 * of a plat pass the room of the shared pass (`sets.ts`). Thus a dot gives way
 * to the dots of the other sets as well as to its own.
 * @returns The target radius for each dot, in device pixels.
 *
 * @internal
 */
export function markTargets(
	marks: readonly MapDotMark[],
	unitsPerPixel: number,
	spare: (at: MapPoint2D) => number,
	beside: readonly number[] = neighborRoom(marks, unitsPerPixel),
): number[] {
	return marks.map(({ at, radius }, index) => {
		// It draws nothing and stands nowhere, so no zone, no region, and no
		// neighbor can be asked about it.
		if (at === null) return POINT_HIT_RADIUS

		const near = beside[index] ?? Number.POSITIVE_INFINITY

		// A neighbor that has already taken the target to the mark's own paint
		// settles it: the clamp floors there, so nothing another claimant says can
		// move the answer. Asked anyway, `spare` is the most expensive question on
		// the map (a grid walk over the region layer) for a figure that is
		// discarded. It fires most where the dots are densest, which is where a
		// summary's grade puts the floor highest.
		if (near <= radius) return radius

		return clamp(Math.min(near, spare(at)), radius, Math.max(radius, POINT_HIT_RADIUS))
	})
}
