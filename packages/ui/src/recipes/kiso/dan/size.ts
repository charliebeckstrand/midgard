/**
 * Dan size: the size ramps: the stepped size, width, and height classes for each role.
 *
 * Layer: kiso · Concern: density ramps
 */

export const size = {
	/** An icon and a loading spinner. `shaku.iconSize` holds the same steps. */
	icon: 'density-size-[3,4,5,6,6]',
	/** An icon in the icon slot of a host. */
	iconSlot: '*:data-[slot=icon]:density-size-[3,4,5,6,6]',
	/** A loading dot. */
	dot: 'density-size-[1,1.5,2,2.5,2.5]',
	/** An avatar in a sidebar item. */
	avatarInSidebarItem:
		'[&:is([data-slot=sidebar-item]>:not([data-density=slot])>*)]:density-size-[5,6,7]',
	/** The check mark of a checkbox and a tree item. */
	check: 'density-size-[3,3.5,4]',
	/**
	 * The box of a checkbox and a radio, the color picker swatch, the check of an
	 * option, and a rating star.
	 */
	checkBox: 'density-size-[4,5,6]',
	/** The dot of a checked radio. */
	radioDot: 'density-size-[1,1.5,2]',
	/** The thumb of a switch and a range slider. */
	thumb: 'density-size-[3,4,5]',
	/** The offset of a checked switch thumb. */
	switchThumbOn: '[:checked~&]:density-left-[4,5,6]',
	/** The color preview of a color panel. */
	colorPreview: 'density-size-[8,9,10]',
	/** The height of the color area of a color panel. */
	colorArea: 'density-h-[32,40,48]',
	/** The height of a color channel slider. */
	colorChannel: 'density-h-[3,3.5,4]',
	/** A progress gauge skeleton. */
	gauge: 'density-size-[12,16,20]',
	/** The height of a button. */
	button: 'density-h-[5.5,7.5,9.5,11.5,11.5]',
	/** The width of a button skeleton. */
	buttonWidth: 'density-w-[16,20,24,28,28]',
	/** A toggle icon button skeleton. */
	iconButton: 'density-size-[4.5,6,7.5,9,9]',
	/** A pagination page skeleton. */
	pagination: 'density-size-[5.5,7.5,9.5,11.5,11.5]',
	/** The height of a badge skeleton. */
	badge: 'density-h-[5.5,6.5,7.5,8.5,8.5]',
	/** The width of a badge skeleton. */
	badgeWidth: 'density-w-[10,12,14,16,16]',
	/** The height of a control skeleton. */
	control: 'density-h-[7.5,9.5,11.5]',
	/** The minimum width of a control skeleton. */
	controlMinWidth: 'density-min-w-[16,24,32]',
	/** A line of text in a skeleton. */
	line: 'density-h-[4,5,6]',
	/** A small line of text in a skeleton. */
	lineSmall: 'density-h-[3,4,5]',
	/** A tiny line in a skeleton: a heading rule or a progress bar. */
	lineTiny: 'density-h-[2,3,4]',
	/** A title line in a heading skeleton. */
	lineTitle: 'density-h-[6,7,8]',
	/** A large title line in a heading skeleton. */
	lineTitleLarge: 'density-h-[7,8,9]',
	/** The title line of a timeline skeleton. */
	lineTimeline: 'density-h-[6,7,7]',
	/** A row in a skeleton: a nav item, a tab, a tree item, or a switch. */
	row: 'density-h-[5,6,7]',
	/** The height of a segment skeleton. */
	segment: 'density-h-[8,10,12]',
	/** The width of a segment skeleton. */
	segmentWidth: 'density-w-[40,48,56]',
	/** The width of a tab skeleton. */
	tabWidth: 'density-w-[14,16,20]',
	/** The width of a switch skeleton. */
	switchWidth: 'density-w-[8,10,12]',
	/** The height of a slider skeleton track. */
	sliderTrack: 'density-h-[1,1.5,2]',
	/** The height of a sparkline. */
	sparkline: 'density-h-[6,8,10]',
	/** The width of a sparkline. */
	sparklineWidth: 'density-w-[18,24,30]',
	/** The width of a calendar. */
	calendarWidth: 'density-w-[52,68,80]',
	/** The width of a color panel. */
	colorPanelWidth: 'density-w-[72,80,88]',
	/** The height of a color panel skeleton. */
	colorPanelHeight: 'density-h-[76.5,98,120]',
	/** The height of a chart skeleton with no ratio. */
	chart: 'density-h-[40,60,80]',
	/** The width of a tree indent guide. */
	treeIndentWidth: 'density-w-[4,5,6]',
	/** The width of a grid column resize handle. */
	resizeHandle: 'density-w-[2,4,6]',
	/** The maximum height of a capped menu. */
	menuMaxHeight: 'density-max-h-[48,52,56]',
} as const
