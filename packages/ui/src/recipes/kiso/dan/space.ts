/**
 * Dan space: the padding and margin ramps: a stepped spacing class for each role.
 *
 * Layer: kiso · Concern: density ramps
 */

export const space = {
	/** The padding of a box: a card, a list, or a date picker body. */
	box: 'density-p-[2,3,4]',
	/** The bottom padding of a box header. */
	boxBottom: 'density-pb-[2,3,4]',
	/** The top padding of a box footer. */
	boxTop: 'density-pt-[2,3,4]',
	/** The padding of a grid cell. It matches `cellX` and `cellY`. */
	cell: 'density-p-[1,2,3]',
	/** The inline padding of a table cell. */
	cellX: 'density-px-[1,2,3]',
	/** The block padding of a table cell. */
	cellY: 'density-py-[1,2,3]',
	/** The padding of a nav item. */
	navItem: 'density-p-[1.5,2,2.5]',
	/** The padding of an alert. */
	alert: 'density-p-[3,4,5]',
	/** The padding of a popover panel. */
	popover: 'density-p-[3,4,6]',
	/** The padding of the sidebar layout regions. */
	shell: 'density-p-[4,6,8]',
	/** The inline padding of the sidebar layout regions. */
	shellX: 'density-px-[4,6,8]',
	/** The bottom padding of the sidebar layout regions. */
	shellBottom: 'density-pb-[4,6,8]',
	/** The top padding of the sidebar layout content from the `lg` breakpoint. */
	shellTopLarge: 'lg:density-pt-[4,6,8]',
	/** The top padding of the sidebar layout content with no header, from the `lg` breakpoint. */
	shellTopNoHeader: 'lg:not-has-[[data-slot=header]]:density-pt-[4,6,8]',
	/** The padding of a tooltip, inside its ring. */
	tooltip: 'density-p-ring-[1,2,3]',
	/** The padding of a query chip, inside its ring. */
	chipQuery: 'density-p-ring-[1.5,1.5,2,2.5,2.5]',
	/** The block padding of a query chip with a label. */
	chipQueryLabelY: 'data-[has-label]:density-py-ring-[1,1,1.5,2,2]',
	/** The padding of a button, inside its ring. */
	button: 'density-p-ring-[1.5,2,2.5,3,3]',
	/** The block padding of a button with a label. */
	buttonLabelY: 'data-[has-label]:density-py-ring-[1,1.5,2,2.5,2.5]',
	/** The padding of a bare icon button. */
	buttonBare: 'not-data-[has-label]:density-p-[0.75,1,1.25,1.5,1.5]',
	/** The padding of a sidebar item, inside its ring. */
	sidebarItem: 'density-p-ring-[1.5,2,2.5]',
	/** The block padding of the button of a sidebar item, equal to the row padding. */
	sidebarItemLabelY: 'data-[has-label]:density-py-ring-[1.5,2,2.5]',
	/** The inline padding of a badge, inside its ring. */
	badgeX: 'density-px-ring-[1,1.5,2,2.5,2.5]',
	/** The inline padding of a pill badge, inside its ring. */
	badgePillX: 'density-px-ring-[1.5,2,2.5,3,3]',
	/** The start padding of a removable badge. */
	badgeRemovableStart: 'data-[has-suffix]:density-ps-ring-[2.25,3,3.75,4.5,4.5]',
	/** The inline padding of a control, inside its ring. */
	controlX: 'density-px-ring-[2.5,3,3.5]',
	/** The block padding of a control, inside its ring. */
	controlY: 'density-py-ring-[1.5,2,2.5]',
	/** The start padding of a control prefix slot. */
	affixStart: 'density-ps-ring-[2.5,3,3.5,3.5,3.5]',
	/** The end padding of a control suffix slot. */
	affixEnd: 'density-pe-ring-[2.5,3,3.5,3.5,3.5]',
	/** The start padding of a prefix slot that holds a bare icon button. */
	affixBareStart:
		'has-[[data-variant=bare]:not([data-has-label])]:density-ps-ring-[1.75,2,2.25,2.25,2.25]',
	/** The end padding of a suffix slot that holds a bare icon button. */
	affixBareEnd:
		'has-[[data-variant=bare]:not([data-has-label])]:density-pe-ring-[1.75,2,2.25,2.25,2.25]',
	/** The start inset of the autofill fill beside a prefix. It equals `controlX`. */
	autofillStart: 'group-has-[[data-slot=prefix]]/control:autofill:density-ms-ring-[2.5,3,3.5]',
	/** The end inset of the autofill fill beside a suffix. It equals `controlX`. */
	autofillEnd: 'group-has-[[data-slot=suffix]]/control:autofill:density-me-ring-[2.5,3,3.5]',
	/** The start margin of a nav row prefix slot, one step below the item. */
	slotStart: 'density-ms-[1.5,2,2.5,2.5,2.5]',
	/** The end margin of a nav row suffix slot, one step below the item. */
	slotEnd: 'density-me-[1.5,2,2.5,2.5,2.5]',
	/** The block padding of the tag row of a tag input. */
	tagsY: 'density-py-ring-[2,2.5,3,3,3]',
	/** The inline padding of a plain list row. */
	listPlainX: 'density-px-[1.5,2,2.5]',
	/** The block padding of a list row and a segment item. */
	rowY: 'density-py-[1,1.5,2]',
	/** The inline padding of an option row. */
	optionX: 'density-px-[2,2.5,3]',
	/** The inline padding of a menu item. */
	menuItemX: 'density-px-[2.5,3,3.5]',
	/** The block padding of an option row and a menu item. */
	optionY: 'density-py-[1,1.5,2.5]',
	/** The inline padding of a segment item. */
	segmentItemX: 'density-px-[2.5,3,4]',
	/** The inline padding of a tab and of the calendar month picker. */
	tabX: 'density-px-[2,3,4]',
	/** The bottom padding of an underline tab. */
	tabBottom: 'density-pb-[3,4,5]',
	/** The inline padding of a pill tab. */
	pillTabX: 'density-px-[3,4,5]',
	/** The block padding of a pill tab. */
	pillTabY: 'density-py-[1.5,2,2.5]',
	/** The block padding of a slider, which holds the thumb. */
	sliderY: 'density-py-[3,4,5]',
	/** The block margin of a slider skeleton track. */
	sliderTrackY: 'density-my-[3,4,5]',
	/** The indent of a nested tree item. */
	treeIndent: 'density-ps-[6,7,8]',
	/** The bottom padding of a vertical timeline item. */
	timelineBottom: 'density-pb-[6,8,10]',
	/** The top padding of a horizontal timeline item. */
	timelineTop: 'density-pt-[6,8,10]',
	/** The bottom margin of the calendar header. */
	calendarHeaderBottom: 'density-mb-[1,2,3]',
	/** The end padding of a resizable grid header, which holds the resize handle. */
	resizeEnd: '[&>*>tr>th[data-resizable]]:density-pe-[2,4,6]',
	/** The top padding of a term in a description list. */
	termTop: '[&>dt]:density-pt-[1.5,2,2.5]',
	/** The bottom padding of a term in a description list row. */
	termBottomRow: 'sm:[&>dt]:density-pb-[1.5,2,2.5]',
	/** The bottom padding of a detail in a description list. */
	detailBottom: '[&>dd]:density-pb-[1.5,2,2.5]',
	/** The top padding of a detail in a description list row. */
	detailTopRow: 'sm:[&>dd]:density-pt-[1.5,2,2.5]',
	/** The top padding of a term in a stacked description list. */
	termTopStacked: '[&>dt]:density-pt-[3,4,5]',
	/** The top padding of a detail in a stacked description list. */
	detailTopStacked: '[&>dd]:density-pt-[0.5,1,1.5]',
	/** The inline padding of an inline code mark and a key. */
	markX: 'density-px-[1,1.5,2]',
	/** The block padding of an inline code mark and a key. */
	markY: 'density-py-[0.5,1,1.5]',
	/** The inline padding of a key in a button. */
	kbdXInButton: '[&:is([data-variant]>*)]:density-px-[1,1.5,1.5]',
	/** The block padding of a key in a button. */
	kbdYInButton: '[&:is([data-variant]>*)]:density-py-[0,0.5,0.5,0.5,0.5]',
	/** The bottom margin of a tab list skeleton. */
	tabsSkeletonMarginBottom: 'density-mb-[3,4,5]',
	/** The start margin of a tab skeleton. */
	tabsSkeletonMarginStart: 'density-ms-[3,4,5]',
	/** The end margin of a tab skeleton. */
	tabsSkeletonMarginEnd: 'density-me-[3,4,5]',
	/** The block margin of a pill tab skeleton. */
	tabsSkeletonMarginY: 'density-my-[1.5,2,2.5]',
} as const
