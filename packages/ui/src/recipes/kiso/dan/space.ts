/**
 * Dan space: the padding and margin ramps: a stepped spacing class for each role.
 *
 * Layer: kiso · Concern: density ramps
 */

/**
 * The named padding scale (`ma.p`, `ma.px`, `ma.py`) of Box. Each stop has its
 * plain value at `md`, the stop below at `sm`, and the stop above at `lg`, as
 * the gap scale (`gap.scale`) does.
 */
const scale = {
	p: {
		xs: 'density-p-[0.25,0.5,1,1.5,2.5]',
		sm: 'density-p-[0.5,1,2,3,4.5]',
		md: 'density-p-[1,2,3,4,5]',
		lg: 'density-p-[2,3,4,5,6]',
		xl: 'density-p-[4,5,6,7,8]',
	},
	px: {
		xs: 'density-px-[0.25,0.5,1,1.5,2.5]',
		sm: 'density-px-[0.5,1,2,3,4.5]',
		md: 'density-px-[1,2,3,4,5]',
		lg: 'density-px-[2,3,4,5,6]',
		xl: 'density-px-[4,5,6,7,8]',
	},
	py: {
		xs: 'density-py-[0.25,0.5,1,1.5,2.5]',
		sm: 'density-py-[0.5,1,2,3,4.5]',
		md: 'density-py-[1,2,3,4,5]',
		lg: 'density-py-[2,3,4,5,6]',
		xl: 'density-py-[4,5,6,7,8]',
	},
} as const

/** The padding of a nav item and a sidebar item. */
const navItem = 'density-p-[1,1.5,2,2.5,3]'

export const space = {
	scale,

	box: {
		/** The padding of a box: a card, a list, or a date picker body. */
		base: scale.p.md,
		/** The bottom padding of a box header. */
		bottom: 'density-pb-[1,2,3,4,5]',
	},
	card: {
		header: {
			/** The bottom padding of a card header, when a sibling follows the header. */
			bottom: 'not-last:density-pb-[1,2,3,4,5]',
		},
		footer: {
			/**
			 * The top padding of a card footer, when a sibling comes before the footer.
			 * When that sibling is a card header, the header pads the edge.
			 */
			top: '[:not([data-slot=card-header])+&]:density-pt-[1,2,3,4,5]',
		},
	},
	cell: {
		/** The padding of a grid cell. It matches `cell.x` and `cell.y`. */
		base: scale.p.sm,
		/** The inline padding of a table cell. */
		x: scale.px.sm,
		/** The block padding of a table cell. */
		y: scale.py.sm,
	},
	nav: {
		/** The padding of a nav item. */
		item: navItem,
	},
	/** The padding of an alert and a code block. */
	alert: scale.p.lg,
	/** The padding of a popover panel. */
	popover: 'density-p-[3,4,6]',
	/**
	 * The inset of a dialog, a drawer, and a sheet: the same length on the four
	 * sides. `panel.layout.inset` is this set, and its doc gives the rule.
	 */
	panel: {
		/** The inset at the left edge and at the right edge, on the panel or on each slot. */
		x: scale.px.xl,
		/**
		 * The negative bottom margin that cancels the slot gap of a panel
		 * (`gap.scale.lg`) under a child that is the edge of the panel.
		 */
		flush: 'density-mb-[-2,-3,-4,-5,-6]',
		/** The slot gap of a panel (`gap.scale.lg`) above a child that follows a sibling. */
		above: 'not-first:density-mt-[2,3,4,5,6]',
		/** The inset above the first slot, on the panel or on the slot. */
		top: 'density-pt-[4,5,6,7,8]',
		/** The inset under the last slot, on the panel or on the slot. */
		bottom: 'density-pb-[4,5,6,7,8]',
		/**
		 * The inset of a body that is the first slot, for each panel that scrolls its
		 * body. It is a margin, because a padding in a scrolling body moves out of view
		 * with the content.
		 *
		 * A form around the body is `display: contents`, so the body can be the first
		 * child of the form while a title comes before the form. Thus the body must
		 * also have no ancestor in the panel that is not a first child. Without this
		 * condition, the inset adds to the slot gap under the title.
		 */
		first: {
			drawer: 'first:not-in-[[data-slot=drawer]_:not(:first-child)]:density-mt-[4,5,6,7,8]',
			sheet: 'first:not-in-[[data-slot=sheet]_:not(:first-child)]:density-mt-[4,5,6,7,8]',
		},
		/**
		 * The inset of a body that is the last slot, a margin for the reason that `first`
		 * gives. The body must have no ancestor in the panel that is not a last child,
		 * for the reason that `first` gives.
		 */
		last: {
			drawer: 'last:not-in-[[data-slot=drawer]_:not(:last-child)]:density-mb-[4,5,6,7,8]',
			sheet: 'last:not-in-[[data-slot=sheet]_:not(:last-child)]:density-mb-[4,5,6,7,8]',
		},
		/**
		 * The bottom inset of a panel on the bottom edge below `sm`, plus the home
		 * indicator inset of a page with `viewport-fit=cover`. Elsewhere the inset of
		 * the home indicator is zero. A `calc` with `env` is not a stop of the
		 * spacing scale, so each step of `bottom` has its own class. Each length is
		 * the stop of `bottom` at that step: `1rem` is 4, `1.25rem` is 5, `1.5rem`
		 * is 6, `1.75rem` is 7, and `2rem` is 8.
		 */
		safe: [
			'max-sm:density-xs:pb-[calc(1rem+env(safe-area-inset-bottom))]',
			'max-sm:density-sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))]',
			'max-sm:density-md:pb-[calc(1.5rem+env(safe-area-inset-bottom))]',
			'max-sm:density-lg:pb-[calc(1.75rem+env(safe-area-inset-bottom))]',
			'max-sm:density-xl:pb-[calc(2rem+env(safe-area-inset-bottom))]',
		],
	},
	shell: {
		/** The padding of the sidebar layout regions. */
		base: 'density-p-[2,4,6,8,10]',
		/** The inline padding of the sidebar layout regions. */
		x: 'density-px-[2,4,6,8,10]',
		/** The bottom padding of the sidebar layout regions. */
		bottom: 'density-pb-[2,4,6,8,10]',
		top: {
			/** The top padding of the sidebar layout content from the `lg` breakpoint. */
			lg: 'lg:density-pt-[2,4,6,8,10]',
			/** The top padding of the sidebar layout content with no header, from the `lg` breakpoint. */
			headless: 'lg:not-has-[[data-slot=header]]:density-pt-[2,4,6,8,10]',
		},
	},
	/** The padding of a tooltip, inside its ring. */
	tooltip: 'density-p-ring-[0.5,1,2,3,4.5]',
	combinator: {
		/** The padding of the combinator button between query chips, inside its ring. */
		base: 'density-p-ring-[1.5,1.5,2,2.5,3]',
		/** The block padding of the combinator button with a label. */
		label: 'data-has-label:density-py-ring-[1,1,1.5,2,2.5]',
	},
	button: {
		/** The padding of a button, inside its ring. */
		base: 'density-p-ring-[1.5,2,2.5,3,3.5]',
		/** The block padding of a button with a label. */
		label: 'data-has-label:density-py-ring-[1,1.5,2,2.5,3]',
		/** The padding of a bare icon button. */
		bare: 'not-data-has-label:density-p-[0.75,1,1.25,1.5,1.75]',
	},
	sidebar: {
		item: {
			/** The padding of a sidebar item. It equals `nav.item`, because the item draws no ring. */
			base: navItem,
			/** The block padding of the button of a sidebar item, equal to the row padding. */
			label: 'data-has-label:density-py-[1,1.5,2,2.5,3]',
		},
	},
	badge: {
		/** The inline padding of a badge, inside its ring. */
		base: 'density-px-ring-[1,1.5,2,2.5,3]',
		/** The inline padding of a pill badge, inside its ring. */
		pill: 'density-px-ring-[1.5,2,2.5,3,3.5]',
		/** The start padding of a removable badge. */
		removable: 'data-has-suffix:density-ps-ring-[2.25,3,3.75,4.5,5.25]',
	},
	control: {
		/** The inline padding of a control, inside its ring. */
		x: 'density-px-ring-[2,2.5,3,3.5,4]',
		/** The block padding of a control, inside its ring. */
		y: 'density-py-ring-[1,1.5,2,2.5,3]',
	},
	affix: {
		/** The start padding of a control prefix slot. */
		prefix: 'density-ps-ring-[2.5,3,3.5,4,4.5]',
		/** The end padding of a control suffix slot. */
		suffix: 'density-pe-ring-[2.5,3,3.5,4,4.5]',
		bare: {
			/** The start padding of a prefix slot that holds a bare icon button. */
			prefix:
				'has-[[data-variant=bare]:not([data-has-label])]:density-ps-ring-[1.75,2,2.25,2.5,2.75]',
			/** The end padding of a suffix slot that holds a bare icon button. */
			suffix:
				'has-[[data-variant=bare]:not([data-has-label])]:density-pe-ring-[1.75,2,2.25,2.5,2.75]',
		},
	},
	autofill: {
		/** The start inset of the autofill fill beside a prefix. It equals `control.x`. */
		prefix: 'group-has-[[data-slot=prefix]]/control:autofill:density-ms-ring-[2,2.5,3,3.5,4]',
		/** The end inset of the autofill fill beside a suffix. It equals `control.x`. */
		suffix: 'group-has-[[data-slot=suffix]]/control:autofill:density-me-ring-[2,2.5,3,3.5,4]',
	},
	slot: {
		/** The start margin of a nav row prefix slot, one step below the item. */
		prefix: 'density-ms-[1.5,2,2.5,3,3.5]',
		/** The end margin of a nav row suffix slot, one step below the item. */
		suffix: 'density-me-[1.5,2,2.5,3,3.5]',
	},
	tags: {
		/** The block padding of the tag row of a tag input. */
		y: 'density-py-ring-[2,2.5,3,3.5,4]',
	},
	list: {
		plain: {
			/** The inline padding of a plain list row. */
			x: 'density-px-[1,1.5,2,2.5,3]',
		},
	},
	row: {
		/** The block padding of a list row and a segment item. */
		y: 'density-py-[0.5,1,1.5,2,2.5]',
	},
	option: {
		/** The inline padding of an option row. */
		x: 'density-px-[1.5,2,2.5,3,3.5]',
		/** The block padding of an option row and a menu item. */
		y: 'density-py-[1,1.5,2.5]',
	},
	menu: {
		item: {
			/** The inline padding of a menu item. */
			x: 'density-px-[2,2.5,3,3.5,4]',
		},
	},
	segment: {
		item: {
			/** The inline padding of a segment item. */
			x: 'density-px-[2.5,3,4]',
		},
	},
	tab: {
		/** The inline padding of a tab and of the calendar month picker. */
		x: scale.px.md,
		/** The bottom padding of an underline tab. */
		bottom: 'density-pb-[2,3,4,5,6]',
		pill: {
			/** The inline padding of a pill tab. */
			x: scale.px.lg,
			/** The block padding of a pill tab. */
			y: 'density-py-[1,1.5,2,2.5,3]',
		},
		skeleton: {
			/** The bottom margin of a tab list skeleton. */
			bottom: 'density-mb-[2,3,4,5,6]',
			/** The start margin of a tab skeleton. */
			start: 'density-ms-[2,3,4,5,6]',
			/** The end margin of a tab skeleton. */
			end: 'density-me-[2,3,4,5,6]',
			/** The block margin of a pill tab skeleton. */
			y: 'density-my-[1,1.5,2,2.5,3]',
		},
	},
	slider: {
		/** The block padding of a slider, which holds the thumb. */
		y: scale.py.lg,
		track: {
			/** The block margin of a slider skeleton track. */
			y: 'density-my-[2,3,4,5,6]',
		},
	},
	tree: {
		/** The indent of a nested tree item: the chevron width plus the row gap (`gap.scale.sm`). */
		indent: 'density-ps-[4.5,5.5,7,8.5,10.5]',
	},
	timeline: {
		/** The bottom padding of a vertical timeline item. */
		bottom: 'density-pb-[4,6,8,10,12]',
		/** The top padding of a horizontal timeline item. */
		top: 'density-pt-[4,6,8,10,12]',
	},
	calendar: {
		header: {
			/** The bottom margin of the calendar header. */
			bottom: 'density-mb-[0.5,1,2,3,4.5]',
		},
	},
	resize: {
		/** The end padding of a resizable grid header, which holds the resize handle. */
		end: '[&>*>tr>th[data-resizable]]:density-pe-[1,2,4,6,9]',
	},
	term: {
		/** The top padding of a term in a description list. */
		top: '[&>dt]:density-pt-[1,1.5,2,2.5,3]',
		row: {
			/** The bottom padding of a term in a description list row. */
			bottom: 'sm:[&>dt]:density-pb-[1,1.5,2,2.5,3]',
		},
		stacked: {
			/** The top padding of a term in a stacked description list. */
			top: '[&>dt]:density-pt-[2,3,4,5,6]',
		},
	},
	detail: {
		/** The bottom padding of a detail in a description list. */
		bottom: '[&>dd]:density-pb-[1,1.5,2,2.5,3]',
		row: {
			/** The top padding of a detail in a description list row. */
			top: 'sm:[&>dd]:density-pt-[1,1.5,2,2.5,3]',
		},
		stacked: {
			/** The top padding of a detail in a stacked description list. */
			top: '[&>dd]:density-pt-[0.25,0.5,1,1.5,2.5]',
		},
	},
	field: {
		/** The gap from a label, or a label row, to the control under it. */
		label:
			'[&>[data-slot=label]:has(+*:not([data-slot=description]))]:density-mb-[0.25,0.5,1,1.5,2.5]',
		/** The gap from a label row (a Flex that holds the label) to the control under it. */
		labelRow:
			'[&>[data-slot=flex]:has(>[data-slot=label]):has(+*:not([data-slot=description]))]:density-mb-[0.25,0.5,1,1.5,2.5]',
		/** The gap from a description to the slot under it. */
		description: '[&>[data-slot=description]+[data-slot]]:density-mt-[0.25,0.5,1,1.5,2.5]',
		/** The gap from a control to the slot under it. */
		control:
			'[&>:is([data-slot=control],[data-slot=control-frame],[data-slot=field])+[data-slot]]:density-mt-[0.5,1,2,3,4.5]',
		/** The gap from a list of controls to the slots under it. */
		list: '[&>[data-slot=list]~[data-slot]]:density-mt-[0.5,1,2,3,4.5]',
		/** The gap above a message or an alert that is not under a label or a description. */
		message:
			'[&>:not([data-slot=label]):not([data-slot=description])+:is([data-slot=message],[role=alert])]:density-mt-[0.5,1,2,3,4.5]',
	},
	fieldset: {
		/** The gap from a legend to the slot under it. */
		legend: '[&>legend+*]:density-pt-[2,3,4,5,6]',
		/** The gap between two fields of a group. */
		field: '[&>[data-slot=field]+[data-slot=field]]:density-mt-[0.5,1,2,3,4.5]',
		/** The gap from the label of a group to its first field. */
		label: '[&>[data-slot=label]+[data-slot=field]]:density-mt-[2,3,4,5,6]',
	},
	mark: {
		/** The inline padding of an inline code mark and a key. */
		x: 'density-px-[0.5,1,1.5,2,2.5]',
		/** The block padding of an inline code mark and a key. */
		y: scale.py.xs,
	},
	kbd: {
		button: {
			/** The inline padding of a key in a button. */
			x: '[&:is([data-variant]>*)]:density-px-[1,1.5,1.5]',
			/**
			 * The block padding of a key in a button: 1 px at each step. The key text is
			 * one step below the label, so its line is 2 px shorter than the line of the
			 * label, and the key keeps the height of the label line.
			 */
			y: '[&:is([data-variant]>*)]:py-px',
		},
	},
} as const
