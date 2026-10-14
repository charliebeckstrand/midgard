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
	xs: 'density-gap-[0.25,0.5,1,1.5,2.5]',
	sm: 'density-gap-[0.5,1,2,3,4.5]',
	md: 'density-gap-[1,2,3,4,5]',
	lg: 'density-gap-[2,3,4,5,6]',
	xl: 'density-gap-[4,5,6,7,8]',
} as const

/** The inline gap (`column-gap`) at each stop of the gap scale. */
const scaleX = {
	xs: 'density-gap-x-[0.25,0.5,1,1.5,2.5]',
	sm: 'density-gap-x-[0.5,1,2,3,4.5]',
	md: 'density-gap-x-[1,2,3,4,5]',
	lg: 'density-gap-x-[2,3,4,5,6]',
	xl: 'density-gap-x-[4,5,6,7,8]',
} as const

/** The block gap (`row-gap`) at each stop of the gap scale. */
const scaleY = {
	xs: 'density-gap-y-[0.25,0.5,1,1.5,2.5]',
	sm: 'density-gap-y-[0.5,1,2,3,4.5]',
	md: 'density-gap-y-[1,2,3,4,5]',
	lg: 'density-gap-y-[2,3,4,5,6]',
	xl: 'density-gap-y-[4,5,6,7,8]',
} as const

/**
 * The gap that a hit area (`TouchTarget`) can fill between two hosts in a row,
 * at each stop of the gap scale. A row of hosts writes it beside the gap of the
 * same stop, so the hit areas meet and do not overlap at each step.
 */
const touchX = {
	xs: 'density-touch-gap-x-[0.25,0.5,1,1.5,2.5]',
	sm: 'density-touch-gap-x-[0.5,1,2,3,4.5]',
	md: 'density-touch-gap-x-[1,2,3,4,5]',
	lg: 'density-touch-gap-x-[2,3,4,5,6]',
	xl: 'density-touch-gap-x-[4,5,6,7,8]',
} as const

/** The gap that a hit area can fill between two hosts in a stack, as `touchX` gives in a row. */
const touchY = {
	xs: 'density-touch-gap-y-[0.25,0.5,1,1.5,2.5]',
	sm: 'density-touch-gap-y-[0.5,1,2,3,4.5]',
	md: 'density-touch-gap-y-[1,2,3,4,5]',
	lg: 'density-touch-gap-y-[2,3,4,5,6]',
	xl: 'density-touch-gap-y-[4,5,6,7,8]',
} as const

/** The gap of a control and of a badge: half of the block padding of a control. */
const narrow = 'density-gap-[0.5,0.75,1,1.25,1.5]'

export const gap = {
	scale,
	/** The inline gap at each stop of `scale`. */
	x: scaleX,
	/** The block gap at each stop of `scale`. */
	y: scaleY,
	touch: {
		/** The touch gap in a row at each stop of `scale`. */
		x: touchX,
		/** The touch gap in a stack at each stop of `scale`. */
		y: touchY,
		/**
		 * The touch gaps of the tag row of a tag input. The row is in the prefix
		 * slot, one step below the host, and `kata/tag-input.ts` gives the lengths.
		 */
		tags: {
			x: 'density-touch-gap-x-[3,3,3.5,4,4]',
			y: 'density-touch-gap-y-[2,2,2.5,3,3]',
		},
		/**
		 * The touch gap along the row of query chips. The row is a slot, one step
		 * below the scope around it, and `kata/query-chips.ts` gives the lengths.
		 */
		chips: 'density-touch-gap-x-[2.75,3.25,3.75,4.25,4.25]',
	},
	/** The default gap: a card footer, the calendar footer, and the segment control. */
	default: scale.sm,
	/** The gap of a nav item and a sidebar item. */
	item: 'density-gap-[1,1.5,2,2.5,3]',
	/** The gap of an option row and a menu item. */
	option: scale.md,
	/** The gap of a color panel. */
	loose: 'density-gap-[1,2,4,6,9]',
	/** The gap of the date picker panes. */
	datePicker: 'density-gap-[1.75,2.25,2.75,3.25,3.75]',
	timeline: {
		/** The inline gap of a timeline item and a code block. */
		x: scaleX.lg,
	},
	/** The gap of a control. */
	control: narrow,
	/** The gap of a button. */
	button: 'density-gap-[0.75,1,1.25,1.5,1.75]',
	/** The gap of a badge. */
	badge: narrow,
	/** The gap of loading dots. */
	dots: 'density-gap-[0.5,1,1.5,2,2.5]',
	/** The gap of a rating skeleton. */
	rating: 'density-gap-[0.25,0.5,0.75,1,1.25]',
} as const
