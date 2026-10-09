/**
 * Dan radius: the radius ramps: a stepped `density-rounded` class for each role.
 *
 * Layer: kiso · Concern: density ramps
 */

/**
 * The radius of a control and of a button: the same stop as the block padding
 * of a control at each step.
 */
const box = 'density-rounded-[1,1.5,2,2.5,3]'

export const radius = {
	/** The radius of a control and a sidebar item. */
	control: box,
	/** The radius of a button. */
	button: box,
	/** The radius of the combinator button between query chips. */
	combinator: 'density-rounded-[1,1,1.5,2,2.5]',
	/** The radius of a tooltip. */
	tooltip: 'density-rounded-[1,2,3]',
	/** The radius of a card. */
	card: 'density-rounded-[sm,md,lg]',
	/** The radius of a checkbox and a tree check. */
	check: 'density-rounded-[0.75,1,1.25]',
} as const
