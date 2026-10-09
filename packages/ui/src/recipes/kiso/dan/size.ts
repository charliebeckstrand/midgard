/**
 * Dan size: the size ramps: the stepped size, width, and height classes for each role.
 *
 * Layer: kiso · Concern: density ramps
 */

/**
 * The glyph scale: the size of an icon and of each glyph beside a label at
 * each step. It is the text size plus 4 px, 16 px to 24 px
 * (`core/density/geometry.ts`).
 */
const glyph = 'density-size-[4,4.5,5,5.5,6]'

/**
 * The glyph scale less 4 px, 12 px to 20 px: the check mark of a checkbox,
 * and the thumb of a switch, which is the line height less 8 px.
 */
const inset = 'density-size-[3,3.5,4,4.5,5]'

/**
 * The height of a button and of a control: the line height and twice the
 * block padding, 26 px to 50 px.
 */
const box = 'density-h-[6.5,8,9.5,11,12.5]'

export const size = {
	icon: {
		/** An icon and a loading spinner. `shaku.icon.size` holds the same steps. */
		base: glyph,
		/** An icon in the icon slot of a host. */
		slot: '*:data-[slot=icon]:density-size-[4,4.5,5,5.5,6]',
		/** A loading spinner in a sidebar row, the same size as the icon of the row. */
		spinner: '*:data-[slot=loading-spinner]:density-size-[4,4.5,5,5.5,6]',
	},
	/** A loading dot. */
	dot: 'density-size-[1,1.5,2,2.5,3]',
	avatar: {
		/** An avatar. */
		base: 'density-size-[7,9,11]',
		/**
		 * An avatar in a sidebar item: a child of the row button, or the circle in a
		 * status wrapper that is such a child.
		 */
		sidebar:
			'[&:is([data-slot=sidebar-item]>:not([data-density=slot])>*,[data-slot=sidebar-item]>:not([data-density=slot])>[data-slot=avatar-with-status]>*)]:density-size-[5,5.5,6,6.5,7]',
	},
	swatch: {
		/** A square or circle swatch, and a status dot. */
		base: 'density-size-[1.5,2,2.5,3,4]',
		/** The width of a line swatch. */
		line: 'density-w-[2,2.5,3,3.5,4]',
	},
	check: {
		/** The check mark of a checkbox and a tree item: the glyph size less 4 px. */
		mark: inset,
		/**
		 * The box of a checkbox and a radio, the color picker swatch, the check of an
		 * option, and a rating star.
		 */
		box: glyph,
	},
	radio: {
		/** The dot of a checked radio. */
		dot: 'density-size-[1,1.5,2]',
	},
	thumb: {
		/** The thumb of a range slider. */
		base: 'density-size-[3,4,5]',
	},
	colorPanel: {
		/** The color preview of a color panel. */
		preview: 'density-size-[8,9,10]',
		/** The height of the color area of a color panel. */
		area: 'density-h-[32,40,48]',
		/** The height of a color channel slider. */
		channel: 'density-h-[3,3.5,4]',
		/** The width of a color panel. */
		width: 'density-w-[72,80,88]',
		/**
		 * The height of the preview row and the channel inputs of a color panel
		 * skeleton, with the gap between them.
		 */
		fields: 'density-h-[22.25,27.75,33.25]',
	},
	/** The diameter of a progress gauge and of its skeleton. */
	gauge: 'density-size-[8,12,16,20,24]',
	button: {
		/** The height of a button. */
		base: box,
		/** The width of a button skeleton. */
		width: 'density-w-[16,20,24,28,32]',
		/** A toggle icon button skeleton. */
		icon: 'density-size-[5.5,6.5,7.5,8.5,9.5]',
	},
	/** A pagination page skeleton. */
	pagination: 'density-size-[6.5,8,9.5,11,12.5]',
	badge: {
		/** The height of a badge skeleton. */
		base: 'density-h-[6.5,7,7.5,8,8.5]',
		/** The width of a badge skeleton. */
		width: 'density-w-[10,12,14,16,18]',
	},
	control: {
		/**
		 * The height of a control skeleton, and of the header row and each day row
		 * of a calendar skeleton. The values are the button heights.
		 */
		base: box,
		/** The minimum width of a control skeleton. */
		min: 'density-min-w-[16,24,32]',
	},
	line: {
		/** A line of small text in a skeleton: the line height of the small text. */
		base: 'density-h-[4.5,5,5.5,6,6.5]',
		/** A subtitle line in a heading skeleton. */
		subtitle: 'density-h-[3,4,5,6,7]',
		/** A small line of text in a skeleton. */
		small: 'density-h-[2,3,4,5,6]',
		/**
		 * A line of a Text skeleton with a `size`: the line height of each step of
		 * the text. The skeleton writes `data-density` only for a `size`.
		 */
		text: 'data-density:density-h-[5,5.5,6,6.5,7]',
		/** A tiny line in a skeleton: a heading rule or a progress bar. */
		tiny: 'density-h-[1,2,3,4,5]',
		title: {
			/** A small title line in a heading skeleton. */
			small: 'density-h-[4,5,6,7,8]',
			/** A title line in a heading skeleton. */
			base: 'density-h-[5,6,7,8,9]',
			/** A large title line in a heading skeleton. */
			large: 'density-h-[6,7,8,9,10]',
		},
		/** The title line of a timeline skeleton. */
		timeline: 'density-h-[5.5,6,6.5,7,8]',
	},
	stat: {
		value: {
			/** The height of a stat value skeleton. */
			base: 'density-h-[7,8,9.5,11,14]',
			/** The width of a stat value skeleton. */
			width: 'density-w-[16,20,24]',
		},
	},
	/** A row in a skeleton: a nav item, a tab, a tree item, or a switch. */
	row: 'density-h-[5,5.5,6,6.5,7]',
	segment: {
		/** The height of a segment skeleton. */
		base: 'density-h-[7.5,9,10.5,12,13.5]',
		/** The width of a segment skeleton. */
		width: 'density-w-[40,48,56]',
	},
	tab: {
		/** The width of a tab skeleton. */
		width: 'density-w-[14,16,20]',
	},
	switch: {
		/** The thumb of a switch: the line height less 8 px. */
		thumb: inset,
		/** The width of a switch skeleton. */
		width: 'density-w-[8,9,10,11,12]',
	},
	slider: {
		/** The height of a slider skeleton track. */
		track: 'density-h-[1,1.5,2]',
	},
	sparkline: {
		/** The height of a sparkline. */
		base: 'density-h-[6,8,10]',
		/** The width of a sparkline. */
		width: 'density-w-[18,24,30]',
	},
	calendar: {
		/** The width of a calendar. */
		width: 'density-w-[52,68,80]',
	},
	/** The height of a chart skeleton with no ratio. */
	chart: 'density-h-[40,60,80]',
	tree: {
		/** The width of a tree indent guide. */
		indent: 'density-w-[4,4.5,5,5.5,6]',
	},
	resize: {
		/** The width of a grid column resize handle. */
		handle: 'density-w-[2,4,6]',
	},
	menu: {
		/** The maximum height of a capped menu. */
		max: 'density-max-h-[48,52,56]',
	},
} as const
