/**
 * Dan gap: the gap ramps: a stepped `density-gap` class for each role.
 *
 * Layer: kiso · Concern: density ramps
 */

/**
 * The name of a stop of the spacing scale: the gap scale and the padding scale
 * (`space.scale`). `0` is the reset stop, spelled the one way everywhere, not
 * `'none'`, and never absent. It is a number so it reads as the bottom of a
 * scale rather than a sixth name.
 */
export type Ma = 0 | 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/**
 * The named gap scale of Flex, Stack, Split, and Columns, and the layout gap
 * of a kata. The `0` stop is no gap, as a stepped rule. It is in the layer of
 * the other stops, so a breakpoint can switch it with one of them. A plain
 * `gap-0` outranks that layer. At `md`, each other stop has its plain value: 4, 8, 12, 16, and 24 px.
 * Each density step multiplies the plain value by one factor: 0.5 at `xs`,
 * 0.75 at `sm`, 1 at `md`, 1.25 at `lg`, and 1.5 at `xl`. So each stop is an
 * equal ramp, with a step of a quarter of its plain value, and the stops keep
 * the ratios of their plain values at each step. Each value is on the 1 px
 * grid. `density-geometry.test.ts` holds each stop to the rule.
 */
const scale = {
	0: 'density-gap-[0,0,0,0,0]',
	xs: 'density-gap-[0.5,0.75,1,1.25,1.5]',
	sm: 'density-gap-[1,1.5,2,2.5,3]',
	md: 'density-gap-[1.5,2.25,3,3.75,4.5]',
	lg: 'density-gap-[2,3,4,5,6]',
	xl: 'density-gap-[3,4.5,6,7.5,9]',
} as const satisfies Record<Ma, string>

/** The inline gap (`column-gap`) at each stop of the gap scale above `0`. */
const scaleX = {
	xs: 'density-gap-x-[0.5,0.75,1,1.25,1.5]',
	sm: 'density-gap-x-[1,1.5,2,2.5,3]',
	md: 'density-gap-x-[1.5,2.25,3,3.75,4.5]',
	lg: 'density-gap-x-[2,3,4,5,6]',
	xl: 'density-gap-x-[3,4.5,6,7.5,9]',
} as const

/** The block gap (`row-gap`) at each stop of the gap scale above `0`. */
const scaleY = {
	xs: 'density-gap-y-[0.5,0.75,1,1.25,1.5]',
	sm: 'density-gap-y-[1,1.5,2,2.5,3]',
	md: 'density-gap-y-[1.5,2.25,3,3.75,4.5]',
	lg: 'density-gap-y-[2,3,4,5,6]',
	xl: 'density-gap-y-[3,4.5,6,7.5,9]',
} as const

/**
 * The gap that a hit area (`TouchTarget`) can fill between two hosts in a row,
 * at each stop of the gap scale above `0`. A row of hosts writes it beside the
 * gap of the same stop, so the hit areas meet and do not overlap at each step.
 */
const touchX = {
	xs: 'density-set-[0.5,0.75,1,1.25,1.5]/[--touch-target-gap-x]',
	sm: 'density-set-[1,1.5,2,2.5,3]/[--touch-target-gap-x]',
	md: 'density-set-[1.5,2.25,3,3.75,4.5]/[--touch-target-gap-x]',
	lg: 'density-set-[2,3,4,5,6]/[--touch-target-gap-x]',
	xl: 'density-set-[3,4.5,6,7.5,9]/[--touch-target-gap-x]',
} as const

/** The gap that a hit area can fill between two hosts in a stack, as `touchX` gives in a row. */
const touchY = {
	xs: 'density-set-[0.5,0.75,1,1.25,1.5]/[--touch-target-gap-y]',
	sm: 'density-set-[1,1.5,2,2.5,3]/[--touch-target-gap-y]',
	md: 'density-set-[1.5,2.25,3,3.75,4.5]/[--touch-target-gap-y]',
	lg: 'density-set-[2,3,4,5,6]/[--touch-target-gap-y]',
	xl: 'density-set-[3,4.5,6,7.5,9]/[--touch-target-gap-y]',
} as const

/**
 * The `sm` gap of `scale` as `--ui-breadcrumb-gap`, in a collapsing breadcrumb.
 * The fit of the trail reads it beside the gap of the same stop.
 */
const breadcrumb = 'in-data-collapse:density-set-[1,1.5,2,2.5,3]/[--ui-breadcrumb-gap]'

/** The gap of a control and of a badge: the `xs` stop of `scale`, half of the block padding of a control. */
const narrow = scale.xs

export const gap = {
	scale,
	/** The inline gap at each stop of `scale` above `0`. */
	x: scaleX,
	/**
	 * The gap of a tree row, after its chevron: the `sm` stop of `scale`, as the
	 * `--nest-gap` input of `narabi.nest`.
	 */
	tree: 'density-set-[1,1.5,2,2.5,3]/[--nest-gap]',
	breadcrumb,
	/** The block gap at each stop of `scale` above `0`. */
	y: scaleY,
	touch: {
		/** The touch gap in a row at each stop of `scale` above `0`. */
		x: touchX,
		/** The touch gap in a stack at each stop of `scale` above `0`. */
		y: touchY,
		/**
		 * The touch gaps of the tag row of a tag input. The row is in the prefix
		 * slot, one step below the host, and `kata/tag-input.ts` gives the lengths.
		 */
		tags: {
			x: 'density-set-[3,3,3.5,4,4]/[--touch-target-gap-x]',
			y: 'density-set-[2,2.25,2.5,2.75,3]/[--touch-target-gap-y]',
		},
		/**
		 * The touch gap along the row of query chips. The row is a slot, one step
		 * below the scope around it, and `kata/query-chips.ts` gives the lengths.
		 */
		chips: 'density-set-[2.75,3.25,3.75,4.25,4.25]/[--touch-target-gap-x]',
		/** The touch gap between two toggle fields on a coarse pointer, as `dan.space.fieldset.toggle` gives it. */
		toggle: 'pointer-coarse:density-set-[3,4.5,6,7.5,9]/[--touch-target-gap-y]',
		toolbar: {
			/** The touch gaps in a toolbar group, as `toolbar.group` gives them. */
			group: {
				x: 'density-set-[0,0.5,0.75,1,1.25]/[--touch-target-gap-x]',
				y: 'density-set-[0,0.5,0.75,1,1.25]/[--touch-target-gap-y]',
			},
		},
	},
	/** The default gap: a card footer, the calendar footer, and the actions of a sidebar layout. */
	default: scale.sm,
	toolbar: {
		/**
		 * The gap in a toolbar group: at each density step, the toolbar gap
		 * (`scale.xs`) of the step below, and 0 at `xs`. It is thus smaller than
		 * the toolbar gap at each step, so a group reads as one cluster.
		 */
		group: 'density-gap-[0,0.5,0.75,1,1.25]',
	},
	/**
	 * The gap between two stacked toasts, at the `sm` stop of `scale`. It is a
	 * custom property and not a `gap`, because a toast pads its own item with it,
	 * and the exit animates that padding to 0.
	 */
	toast: 'density-set-[1,1.5,2,2.5,3]/[--toast-gap]',
	/** The gap of a nav item, a sidebar item, and a tab: the `sm` stop of `scale`. */
	item: scale.sm,
	/** The gap of an option row and a menu item. */
	option: scale.md,
	/** The gap of a color panel. */
	colorPanel: 'density-gap-[1,2,4,6,9]',
	/** The gap between the value and the icon of a date picker trigger, and of its skeleton. */
	datePicker: 'density-gap-[1.75,2.25,2.75,3.25,3.75]',
	timeline: {
		/** The inline gap of a timeline item. */
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
	/**
	 * The gap of a vertical step of a stepper, in `--ui-stepper-gap`: the `lg`
	 * stop of `scale`. A plain utility reads it, so a breakpoint can replace it
	 * with the plain gap of a horizontal step.
	 */
	stepper: 'density-set-[2,3,4,5,6]/[--ui-stepper-gap]',
	/** The gap of the stars of a rating, live and in its skeleton. */
	rating: 'density-gap-[0.25,0.5,0.75,1,1.25]',
} as const
