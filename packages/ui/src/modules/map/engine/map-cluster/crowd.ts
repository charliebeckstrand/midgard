/**
 * How far each drawn dot's pointer target reaches, and why it is ever less than
 * the whole. Clustering has already merged everything that draws over its
 * neighbour (`group.ts`); this reads what survived that merge and asks a wider
 * question of it — not whether two marks overlap, but how much of the ground
 * under one of them belongs to something else.
 *
 * Three things claim that ground. A neighbour inside the coarse reach claims it,
 * because a target that covered a neighbour's face would take that neighbour's
 * readout with it and the mark a reader can see would answer nothing. A drawn zone
 * under the dot claims it. And a region layer that answers the pointer at all claims
 * it — a readout, a pick, a menu — because the dot is the topmost thing at its own
 * pixels and none of the three can be reached where a 44px target covers the shape.
 * The last two arrive the same way, folded into the one budget the plat hands in:
 * the zone half off its ledger, the region half off the geography under the dot, both
 * spelled as a reach. That is what let the third be added without this pass learning
 * anything new. {@link markTargets} is where they meet, so every dot-shaped mark reads one
 * rule rather than assembling its own.
 *
 * The crowding half reads one mark's own drawn dots — a `MapPoints`'s groups, a
 * `MapMarker`'s pair of pins — rather than every dot on the map. Pooling them
 * would have to happen in the plat, and the plat cannot see the zoom scale every
 * reach here is measured in: `MapZoomScaleContext` sits below it, around the plot
 * alone, precisely so a wheel notch re-renders the marks without re-rendering the
 * plat, its legend, and the region layer. So two separate marks drawn within a
 * target's reach of one another each keep the full RADIUS here — the bound this
 * pass accepts, and `ground.ts` answers instead by dividing what the two overlap
 * rather than by shrinking either. It can pool across marks where this cannot,
 * because it measures in frame units and a frame position is scale-free where a
 * reach is not. `MapPoint` reads it today; the plural marks do not yet.
 *
 * Frame arithmetic over the same grid the clustering passes bucket into
 * (`grid.ts`), and React-free like the rest of the engine.
 */

import { clamp } from '../../../../utilities'
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
 * How much reach a target centred on `mark` has before it covers the face
 * `other` paints, in device pixels — the gap between them less what the
 * neighbour draws. Read one way round rather than as an overlap: the mark whose
 * target reaches a neighbour is the one that gives ground back, and a wide
 * summary beside a small dot is not the same case as the small dot beside it.
 *
 * `Infinity` where the neighbour is beyond that reach anyway — the identity of
 * the minimum a caller folds these into, so a far neighbour needs no special case
 * and no layer below {@link markTargets} has to know what the cap is.
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
 * How much reach the nearest neighbour leaves each drawn dot, index for index
 * with the marks handed in — `Infinity` where nothing stands inside that dot's
 * coarse reach, which {@link markTargets} then caps.
 *
 * `unitsPerPixel` is what one device pixel spans in frame units — `1` at rest,
 * and `1 / k` under the zoom layer's transform. Every reach here is a pixel
 * measure and every position is a frame one, so the conversion lands once, on the
 * way into {@link roomBeside}. A zoom that spreads the dots apart on screen frees
 * their targets on the same beat it separates a summary into its own dots, which
 * is the beat those dots need aiming at.
 *
 * Past {@link INDEX_THRESHOLD} marks the pass indexes through the shared grid, so
 * a mark reads the nine cells around it rather than every other mark — a set of
 * hundreds would otherwise be a quadratic scan on every regrouping.
 *
 * @param marks - The drawn dots, in the order they draw.
 * @param unitsPerPixel - Frame units per device pixel under the plat's zoom.
 * @returns The reach each dot's neighbours leave it, in device pixels.
 *
 * @internal
 */
export function neighbourRoom(marks: readonly MapDotMark[], unitsPerPixel = 1): number[] {
	// A mark alone on the frame has no neighbour to give ground to, which is every
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
	// sit in the nine cells around it — the bound `group.ts` runs its own passes on.
	const reach = (POINT_HIT_RADIUS + MAX_CLUSTER_RADIUS) * unitsPerPixel

	const cells = new Map<number, number[]>()

	marks.forEach((mark, index) => {
		if (mark.at !== null) bucket(cells, cellOf(mark.at, reach)).push(index)
	})

	return marks.map(({ at }, index) => {
		if (at === null) return Number.POSITIVE_INFINITY

		let room = Number.POSITIVE_INFINITY

		walkNear(cells, at, reach, (slot) => {
			// Its own entry answers itself, and a dot is never its own neighbour.
			const other = slot === index ? undefined : marks[slot]

			if (other !== undefined) room = Math.min(room, roomBeside(at, other, unitsPerPixel))

			// Never stops the walk, where `group.ts` reads this return to stop on its
			// first hit: the nearest neighbour decides the reach, so every near cell has
			// to be read before the answer is known.
			return false
		})

		return room
	})
}

/**
 * The radius each drawn dot's pointer target takes, in device pixels — index for
 * index with the marks handed in, and the one place every claim on that ground
 * meets.
 *
 * A dot takes the whole finger target where nothing else needs the ground under
 * it, and gives way as something does: a neighbour close enough that the target
 * would cover its face, or a zone or region it stands on with only so much room to
 * spare. All three arrive as the same measure — a reach in device pixels, `Infinity`
 * where the claimant wants nothing — so the answer is their minimum, clamped between
 * what the dot paints and the reach a finger takes. A target narrower than its own
 * dot would leave the dot a dead rim, and one wider than the finger target is
 * reach no pointer asked for.
 *
 * This is the one place {@link POINT_HIT_RADIUS} means the cap. Every producer
 * below it spells "I claim nothing" as the identity of the minimum instead, so a
 * third claimant added later needs to know only its own measure.
 *
 * A measure rather than the pair of booleans this replaced. The zone half asked
 * whether a dot stood inside a zone, which has no answer on the boundary — and a
 * zone drawn through its own marks puts every one of them exactly there, where a
 * ray cast is decided by the ring's winding and its concavity. Asking how much
 * room there is instead has an answer everywhere, and it is the same answer for
 * every dot on one zone, which is what a reader sees when four corners of one
 * corridor all point alike.
 *
 * @param marks - The drawn dots, in the order they draw.
 * @param unitsPerPixel - Frame units per device pixel under the plat's zoom.
 * @param spare - How much reach the drawn zones and the region layer leave a mark
 * at a position — the plat's own resolver over its ledger, which answers the
 * legend as it toggles, already bound to the scale by `useMapOverlay`.
 * @returns The target radius for each dot, in device pixels.
 *
 * @internal
 */
export function markTargets(
	marks: readonly MapDotMark[],
	unitsPerPixel: number,
	spare: (at: MapPoint2D) => number,
): number[] {
	const beside = neighbourRoom(marks, unitsPerPixel)

	return marks.map(({ at, radius }, index) => {
		// It draws nothing and stands nowhere, so no zone, no region, and no
		// neighbour can be asked about it.
		if (at === null) return POINT_HIT_RADIUS

		const near = beside[index] ?? Number.POSITIVE_INFINITY

		// A neighbour that has already taken the target to the mark's own paint
		// settles it: the clamp floors there, so nothing another claimant says can
		// move the answer. Asked anyway, `spare` is the most expensive question on
		// the map — a grid walk over the region layer — for a figure that is
		// discarded. It fires most where the dots are densest, which is where a
		// summary's grade puts the floor highest.
		if (near <= radius) return radius

		return clamp(Math.min(near, spare(at)), radius, POINT_HIT_RADIUS)
	})
}
