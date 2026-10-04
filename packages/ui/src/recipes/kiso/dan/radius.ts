/**
 * Dan radius: the radius ramps: a stepped `density-rounded` class for each role.
 *
 * Layer: kiso · Concern: density ramps
 */

export const radius = {
	/** The radius of a control and a sidebar item. */
	control: 'density-rounded-[1.5,2,2.5]',
	/** The radius of a button. */
	button: 'density-rounded-[1,1.5,2,2.5,2.5]',
	/** The radius of the combinator button between query chips. */
	combinator: 'density-rounded-[1,1,1.5,2,2]',
	/** The radius of a tooltip. */
	tooltip: 'density-rounded-[1,2,3]',
	/** The radius of a card. */
	card: 'density-rounded-[sm,md,lg]',
	/** The radius of a checkbox and a tree check. */
	check: 'density-rounded-[0.75,1,1.25]',
} as const
