/**
 * Narabi touch: the touch gaps of a container whose hosts touch. A host of
 * `TouchTarget` grows its hit area to the floor, up to the gap to the next
 * host. A container that sets the gap on an axis to zero keeps each hit area
 * to its host on that axis, so two adjacent hosts do not overlap. The hit area
 * keeps the floor on the other axis. A pitch sets the gaps to zero as a flush
 * grid does, and on a coarse pointer it gives each cell the floor
 * (`core/touch/pitch.ts`), so a finger does not hit the next cell.
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
	/** The cells of a grid touch, and each cell has the coarse floor on a coarse pointer. */
	pitch: 'touch-pitch',
} as const
