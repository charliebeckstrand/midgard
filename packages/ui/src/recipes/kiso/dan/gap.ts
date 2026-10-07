/**
 * Dan gap: the gap ramps: a stepped `density-gap` class for each role.
 *
 * Layer: kiso · Concern: density ramps
 */

/**
 * The named gap scale (`ma.gap`) of Flex, Stack, and Split, and the layout gap
 * of a kata. Each stop has its plain value at `md`, the stop below at `sm`,
 * and the stop above at `lg`.
 */
const scale = {
	xs: 'density-gap-[0.5,1,1.5]',
	sm: 'density-gap-[1,2,3]',
	md: 'density-gap-[2,3,4]',
	lg: 'density-gap-[3,4,5]',
	xl: 'density-gap-[5,6,7]',
} as const

export const gap = {
	scale,
	/** The default gap: a card footer, the calendar footer, and the segment control. */
	default: scale.sm,
	/** The block gap of a date picker body. */
	y: 'density-gap-y-[1,2,3]',
	/** The gap of a nav item and a sidebar item. */
	item: 'density-gap-[1.5,2,2.5]',
	/** The gap of an option row and a menu item. */
	option: 'density-gap-[2,3,3]',
	/** The gap of a color panel. */
	loose: 'density-gap-[2,4,6]',
	/** The gap of the date picker panes. */
	datePicker: 'density-gap-[2.25,2.75,3.25]',
	timeline: {
		/** The inline gap of a timeline item and a code block. */
		x: 'density-gap-x-[3,4,5]',
	},
	/** The gap of a control. */
	control: 'density-gap-[0.75,1,1.25]',
	/** The gap of a button. */
	button: 'density-gap-[0.75,1,1.25,1.5,1.5]',
	/** The gap of a badge. */
	badge: 'density-gap-[0.5,0.75,1,1.25,1.25]',
	/** The gap of loading dots. */
	dots: 'density-gap-[0.5,1,1.5,2,2]',
	/** The gap of a rating skeleton. */
	rating: 'density-gap-[0.5,0.5,1]',
} as const
