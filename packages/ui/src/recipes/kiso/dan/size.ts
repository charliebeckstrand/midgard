/**
 * Dan size: the size ramps: the stepped size, width, and height classes for each role.
 *
 * Layer: kiso · Concern: density ramps
 */

/**
 * The icon scale at the inner steps: `size-4` to `size-6`. In an `xs` scope it
 * takes `sm`, and in an `xl` scope it takes `lg`.
 */
const inner = 'density-size-[4,5,6]'

export const size = {
	icon: {
		/** An icon and a loading spinner. `shaku.icon.size` holds the same steps. */
		base: 'density-size-[3,4,5,6,6]',
		/** An icon in the icon slot of a host. */
		slot: '*:data-[slot=icon]:density-size-[3,4,5,6,6]',
		/**
		 * An icon in a nav item and a sidebar item. It stops at `sm` and `lg`, as the
		 * text, the gap, and the padding of the row do.
		 */
		row: {
			/** The icon element, for the skeleton of a row. */
			base: inner,
			/** An icon in the icon slot of a row. */
			slot: '*:data-[slot=icon]:density-size-[4,5,6]',
			/** A loading spinner in a sidebar row, the same size as the icon of the row. */
			spinner: '*:data-[slot=loading-spinner]:density-size-[4,5,6]',
		},
	},
	/** A loading dot. */
	dot: 'density-size-[1,1.5,2,2.5,2.5]',
	avatar: {
		/** An avatar. */
		base: 'density-size-[7,9,11]',
		/**
		 * An avatar in a sidebar item: a child of the row button, or the circle in a
		 * status wrapper that is such a child.
		 */
		sidebar:
			'[&:is([data-slot=sidebar-item]>:not([data-density=slot])>*,[data-slot=sidebar-item]>:not([data-density=slot])>[data-slot=avatar-with-status]>*)]:density-size-[5,6,7]',
	},
	swatch: {
		/** A square or circle swatch, and a status dot. */
		base: 'density-size-[1.5,2,2.5,3,4]',
		/** The width of a line swatch. */
		line: 'density-w-[2,2.5,3,3.5,4]',
	},
	check: {
		/** The check mark of a checkbox and a tree item. */
		mark: 'density-size-[3,3.5,4]',
		/**
		 * The box of a checkbox and a radio, the color picker swatch, the check of an
		 * option, and a rating star.
		 */
		box: inner,
	},
	radio: {
		/** The dot of a checked radio. */
		dot: 'density-size-[1,1.5,2]',
	},
	thumb: {
		/** The thumb of a switch and a range slider. */
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
		fields: 'density-h-[21.75,27.75,34.25]',
	},
	/** The diameter of a progress gauge and of its skeleton. */
	gauge: 'density-size-[12,16,20]',
	button: {
		/** The height of a button. */
		base: 'density-h-[5.5,7.5,9.5,11.5,11.5]',
		/** The width of a button skeleton. */
		width: 'density-w-[16,20,24,28,28]',
		/** A toggle icon button skeleton. */
		icon: 'density-size-[4.5,6,7.5,9,9]',
	},
	/** A pagination page skeleton. */
	pagination: 'density-size-[5.5,7.5,9.5,11.5,11.5]',
	badge: {
		/** The height of a badge skeleton. */
		base: 'density-h-[5.5,6.5,7.5,8.5,8.5]',
		/** The width of a badge skeleton. */
		width: 'density-w-[10,12,14,16,16]',
	},
	control: {
		/**
		 * The height of a control skeleton, and of the header row and each day row
		 * of a calendar skeleton. The values are the button heights at `sm`, `md`,
		 * and `lg`. The ramp has three values, so `xs` takes the `sm` value, as the
		 * calendar does.
		 */
		base: 'density-h-[7.5,9.5,11.5]',
		/** The minimum width of a control skeleton. */
		min: 'density-min-w-[16,24,32]',
	},
	line: {
		/** A line of text in a skeleton. */
		base: 'density-h-[4,5,6]',
		/** A small line of text in a skeleton. */
		small: 'density-h-[3,4,5]',
		/**
		 * A line of a Text skeleton with a `size`: the line height of each step of
		 * the text. The skeleton writes `data-density` only for a `size`.
		 */
		text: 'data-density:density-h-[4,5,6,7,7]',
		/** A tiny line in a skeleton: a heading rule or a progress bar. */
		tiny: 'density-h-[2,3,4]',
		title: {
			/** A title line in a heading skeleton. */
			base: 'density-h-[6,7,8]',
			/** A large title line in a heading skeleton. */
			large: 'density-h-[7,8,9]',
		},
		/** The title line of a timeline skeleton. */
		timeline: 'density-h-[6,7,7]',
	},
	stat: {
		value: {
			/** The height of a stat value skeleton. */
			base: 'density-h-[8,9,10]',
			/** The width of a stat value skeleton. */
			width: 'density-w-[16,20,24]',
		},
	},
	/** A row in a skeleton: a nav item, a tab, a tree item, or a switch. */
	row: 'density-h-[5,6,7]',
	segment: {
		/** The height of a segment skeleton. */
		base: 'density-h-[8,10,12]',
		/** The width of a segment skeleton. */
		width: 'density-w-[40,48,56]',
	},
	tab: {
		/** The width of a tab skeleton. */
		width: 'density-w-[14,16,20]',
	},
	switch: {
		/** The width of a switch skeleton. */
		width: 'density-w-[8,10,12]',
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
		indent: 'density-w-[4,5,6]',
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
