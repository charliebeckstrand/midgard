/**
 * Narabi touch: the touch gaps of a container whose hosts touch. A host of
 * `TouchTarget` grows its hit area to the floor, up to the gap to the next
 * host. A container that sets the gap on an axis to zero keeps each hit area
 * to its host on that axis, so two adjacent hosts do not overlap. The hit area
 * keeps the floor on the other axis. A tile lets each hit area fill the gap
 * to the next host, also when the host is at the floor or over it. A pitch
 * sets the gaps to zero as a flush grid does. On a coarse pointer, it also
 * gives each cell the floor (`core/touch/pitch.ts`), so a finger does not hit
 * the next cell.
 *
 * A scroll box with no padding keeps each hit area at its bottom edge in the
 * box (`core/touch/scroll.ts`).
 *
 * Layer: kiso · Concern: touch gap of touching hosts
 */

export const touch = {
	/** The gap to the next host is zero. */
	flush: {
		/** The hosts touch in a row. */
		x: '[--touch-target-gap-x:0px]',
		/** The hosts touch in a stack. */
		y: '[--touch-target-gap-y:0px]',
	},
	/**
	 * The hit areas fill the gap to the next host at each host size, so the
	 * pointer meets no dead space between two hosts. The touch gap of the axis
	 * gives the length (`TouchTarget`).
	 */
	tile: {
		/** The hit areas tile a row. */
		x: '[--touch-target-tile-x:1]',
		/** The hit areas tile a stack. */
		y: '[--touch-target-tile-y:1]',
	},
	/** The cells of a grid touch, and each cell has the coarse floor on a coarse pointer. */
	pitch: 'touch-pitch',
	/**
	 * A scroll box with no padding of its own keeps each hit area at its bottom
	 * edge in the box on a coarse pointer (`core/touch/scroll.ts`).
	 */
	scroll: 'touch-scroll',
} as const
