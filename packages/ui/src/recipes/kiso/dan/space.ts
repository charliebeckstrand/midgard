/**
 * Dan space: the padding and margin ramps: a stepped spacing class for each role.
 *
 * Layer: kiso · Concern: density ramps
 */

export const space = {
	box: {
		/** The padding of a box: a card, a list, or a date picker body. */
		base: 'density-p-[2,3,4]',
		/** The bottom padding of a box header. */
		bottom: 'density-pb-[2,3,4]',
	},
	card: {
		header: {
			/** The bottom padding of a card header, when a sibling follows the header. */
			bottom: 'not-last:density-pb-[2,3,4]',
		},
		footer: {
			/**
			 * The top padding of a card footer, when a sibling comes before the footer.
			 * When that sibling is a card header, the header pads the edge.
			 */
			top: '[:not([data-slot=card-header])+&]:density-pt-[2,3,4]',
		},
	},
	cell: {
		/** The padding of a grid cell. It matches `cell.x` and `cell.y`. */
		base: 'density-p-[1,2,3]',
		/** The inline padding of a table cell. */
		x: 'density-px-[1,2,3]',
		/** The block padding of a table cell. */
		y: 'density-py-[1,2,3]',
	},
	nav: {
		/** The padding of a nav item. */
		item: 'density-p-[1.5,2,2.5]',
	},
	/** The padding of an alert and a code block. */
	alert: 'density-p-[3,4,5]',
	/** The padding of a popover panel. */
	popover: 'density-p-[3,4,6]',
	/**
	 * The inset of a dialog, a drawer, and a sheet: the same length on the four
	 * sides. `panel.layout.inset` is this set, and its doc gives the rule.
	 */
	panel: {
		/** The inset at the left edge and at the right edge, on the panel or on each slot. */
		x: 'density-px-[5,6,7]',
		/** The inset above the first slot, on the panel or on the slot. */
		top: 'density-pt-[5,6,7]',
		/** The inset under the last slot, on the panel or on the slot. */
		bottom: 'density-pb-[5,6,7]',
		/**
		 * The inset of a body that is the first slot. It is a margin, because a padding
		 * in a scrolling body moves out of view with the content.
		 */
		first: 'first:density-mt-[5,6,7]',
		/** The inset of a body that is the last slot, a margin for the reason that `first` gives. */
		last: 'last:density-mb-[5,6,7]',
		/**
		 * The bottom inset of a panel on the bottom edge below `sm`, plus the home
		 * indicator inset of a page with `viewport-fit=cover`. Elsewhere the inset of
		 * the home indicator is zero. A `calc` with `env` is not a stop of the
		 * spacing scale, so each step of `bottom` has its own class. Each length is
		 * the stop of `bottom` at that step: `1.25rem` is 5, `1.5rem` is 6, and
		 * `1.75rem` is 7.
		 */
		safe: [
			'max-sm:density-[xs,sm]:pb-[calc(1.25rem+env(safe-area-inset-bottom))]',
			'max-sm:density-md:pb-[calc(1.5rem+env(safe-area-inset-bottom))]',
			'max-sm:density-[lg,xl]:pb-[calc(1.75rem+env(safe-area-inset-bottom))]',
		],
	},
	shell: {
		/** The padding of the sidebar layout regions. */
		base: 'density-p-[4,6,8]',
		/** The inline padding of the sidebar layout regions. */
		x: 'density-px-[4,6,8]',
		/** The bottom padding of the sidebar layout regions. */
		bottom: 'density-pb-[4,6,8]',
		top: {
			/** The top padding of the sidebar layout content from the `lg` breakpoint. */
			lg: 'lg:density-pt-[4,6,8]',
			/** The top padding of the sidebar layout content with no header, from the `lg` breakpoint. */
			headless: 'lg:not-has-[[data-slot=header]]:density-pt-[4,6,8]',
		},
	},
	/** The padding of a tooltip, inside its ring. */
	tooltip: 'density-p-ring-[1,2,3]',
	combinator: {
		/** The padding of the combinator button between query chips, inside its ring. */
		base: 'density-p-ring-[1.5,1.5,2,2.5,2.5]',
		/** The block padding of the combinator button with a label. */
		label: 'data-has-label:density-py-ring-[1,1,1.5,2,2]',
	},
	button: {
		/** The padding of a button, inside its ring. */
		base: 'density-p-ring-[1.5,2,2.5,3,3]',
		/** The block padding of a button with a label. */
		label: 'data-has-label:density-py-ring-[1,1.5,2,2.5,2.5]',
		/** The padding of a bare icon button. */
		bare: 'not-data-has-label:density-p-[0.75,1,1.25,1.5,1.5]',
	},
	sidebar: {
		item: {
			/** The padding of a sidebar item, inside its ring. */
			base: 'density-p-ring-[1.5,2,2.5]',
			/** The block padding of the button of a sidebar item, equal to the row padding. */
			label: 'data-has-label:density-py-ring-[1.5,2,2.5]',
		},
	},
	badge: {
		/** The inline padding of a badge, inside its ring. */
		base: 'density-px-ring-[1,1.5,2,2.5,2.5]',
		/** The inline padding of a pill badge, inside its ring. */
		pill: 'density-px-ring-[1.5,2,2.5,3,3]',
		/** The start padding of a removable badge. */
		removable: 'data-has-suffix:density-ps-ring-[2.25,3,3.75,4.5,4.5]',
	},
	control: {
		/** The inline padding of a control, inside its ring. */
		x: 'density-px-ring-[2.5,3,3.5]',
		/** The block padding of a control, inside its ring. */
		y: 'density-py-ring-[1.5,2,2.5]',
	},
	affix: {
		/** The start padding of a control prefix slot. */
		prefix: 'density-ps-ring-[2.5,3,3.5,3.5,3.5]',
		/** The end padding of a control suffix slot. */
		suffix: 'density-pe-ring-[2.5,3,3.5,3.5,3.5]',
		bare: {
			/** The start padding of a prefix slot that holds a bare icon button. */
			prefix:
				'has-[[data-variant=bare]:not([data-has-label])]:density-ps-ring-[1.75,2,2.25,2.25,2.25]',
			/** The end padding of a suffix slot that holds a bare icon button. */
			suffix:
				'has-[[data-variant=bare]:not([data-has-label])]:density-pe-ring-[1.75,2,2.25,2.25,2.25]',
		},
	},
	autofill: {
		/** The start inset of the autofill fill beside a prefix. It equals `control.x`. */
		prefix: 'group-has-[[data-slot=prefix]]/control:autofill:density-ms-ring-[2.5,3,3.5]',
		/** The end inset of the autofill fill beside a suffix. It equals `control.x`. */
		suffix: 'group-has-[[data-slot=suffix]]/control:autofill:density-me-ring-[2.5,3,3.5]',
	},
	slot: {
		/** The start margin of a nav row prefix slot, one step below the item. */
		prefix: 'density-ms-[1.5,2,2.5,2.5,2.5]',
		/** The end margin of a nav row suffix slot, one step below the item. */
		suffix: 'density-me-[1.5,2,2.5,2.5,2.5]',
	},
	tags: {
		/** The block padding of the tag row of a tag input. */
		y: 'density-py-ring-[2,2.5,3,3,3]',
	},
	list: {
		plain: {
			/** The inline padding of a plain list row. */
			x: 'density-px-[1.5,2,2.5]',
		},
	},
	row: {
		/** The block padding of a list row and a segment item. */
		y: 'density-py-[1,1.5,2]',
	},
	option: {
		/** The inline padding of an option row. */
		x: 'density-px-[2,2.5,3]',
		/** The block padding of an option row and a menu item. */
		y: 'density-py-[1,1.5,2.5]',
	},
	menu: {
		item: {
			/** The inline padding of a menu item. */
			x: 'density-px-[2.5,3,3.5]',
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
		x: 'density-px-[2,3,4]',
		/** The bottom padding of an underline tab. */
		bottom: 'density-pb-[3,4,5]',
		pill: {
			/** The inline padding of a pill tab. */
			x: 'density-px-[3,4,5]',
			/** The block padding of a pill tab. */
			y: 'density-py-[1.5,2,2.5]',
		},
		skeleton: {
			/** The bottom margin of a tab list skeleton. */
			bottom: 'density-mb-[3,4,5]',
			/** The start margin of a tab skeleton. */
			start: 'density-ms-[3,4,5]',
			/** The end margin of a tab skeleton. */
			end: 'density-me-[3,4,5]',
			/** The block margin of a pill tab skeleton. */
			y: 'density-my-[1.5,2,2.5]',
		},
	},
	slider: {
		/** The block padding of a slider, which holds the thumb. */
		y: 'density-py-[3,4,5]',
		track: {
			/** The block margin of a slider skeleton track. */
			y: 'density-my-[3,4,5]',
		},
	},
	tree: {
		/** The indent of a nested tree item. */
		indent: 'density-ps-[6,7,8]',
	},
	timeline: {
		/** The bottom padding of a vertical timeline item. */
		bottom: 'density-pb-[6,8,10]',
		/** The top padding of a horizontal timeline item. */
		top: 'density-pt-[6,8,10]',
	},
	calendar: {
		header: {
			/** The bottom margin of the calendar header. */
			bottom: 'density-mb-[1,2,3]',
		},
	},
	resize: {
		/** The end padding of a resizable grid header, which holds the resize handle. */
		end: '[&>*>tr>th[data-resizable]]:density-pe-[2,4,6]',
	},
	term: {
		/** The top padding of a term in a description list. */
		top: '[&>dt]:density-pt-[1.5,2,2.5]',
		row: {
			/** The bottom padding of a term in a description list row. */
			bottom: 'sm:[&>dt]:density-pb-[1.5,2,2.5]',
		},
		stacked: {
			/** The top padding of a term in a stacked description list. */
			top: '[&>dt]:density-pt-[3,4,5]',
		},
	},
	detail: {
		/** The bottom padding of a detail in a description list. */
		bottom: '[&>dd]:density-pb-[1.5,2,2.5]',
		row: {
			/** The top padding of a detail in a description list row. */
			top: 'sm:[&>dd]:density-pt-[1.5,2,2.5]',
		},
		stacked: {
			/** The top padding of a detail in a stacked description list. */
			top: '[&>dd]:density-pt-[0.5,1,1.5]',
		},
	},
	mark: {
		/** The inline padding of an inline code mark and a key. */
		x: 'density-px-[1,1.5,2]',
		/** The block padding of an inline code mark and a key. */
		y: 'density-py-[0.5,1,1.5]',
	},
	kbd: {
		button: {
			/** The inline padding of a key in a button. */
			x: '[&:is([data-variant]>*)]:density-px-[1,1.5,1.5]',
			/** The block padding of a key in a button. */
			y: '[&:is([data-variant]>*)]:density-py-[0,0.5,0.5,0.5,0.5]',
		},
	},
} as const
