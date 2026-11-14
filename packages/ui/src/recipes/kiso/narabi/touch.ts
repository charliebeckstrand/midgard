/**
 * Narabi touch: the touch gaps of a container whose hosts touch. A host of
 * `TouchTarget` grows its hit area to the floor, up to the gap to the next
 * host. A container that sets the gap on an axis to zero keeps each hit area
 * to its host on that axis, so two adjacent hosts do not overlap. The hit area
 * keeps the floor on the other axis.
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
		/** The hosts touch on the two axes, such as the cells of a grid. */
		both: ['[--touch-target-gap-x:0px]', '[--touch-target-gap-y:0px]'],
	},
} as const
