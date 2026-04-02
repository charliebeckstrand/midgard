/**
 * Narabi (並び) — Arrangement.
 *
 * How elements line up — the ordering, positioning, and slot relationships
 * between siblings. The choreography of a layout.
 *
 * Branch of: Narabi (root)
 * Concern: layout
 */

import { sumi } from './sumi'

export const narabi = {
	/** How form field slots relate — label → control → description → error */
	field: [
		'[&>[data-slot=label]+[data-slot=control]]:mt-2',
		'[&>[data-slot=label]+[data-slot=description]]:mt-1',
		'[&>[data-slot=description]+[data-slot=control]]:mt-2',
		'[&>[data-slot=control]+[data-slot=description]]:mt-2',
		'[&>[data-slot=control]+[data-slot=error]]:mt-2',
		'*:data-[slot=label]:font-medium',
	],

	/** Popover placement positions */
	anchor: {
		bottom: 'top-full left-0 mt-2',
		'bottom start': 'top-full left-0 mt-2',
		'bottom end': 'top-full right-0 mt-2',
		top: 'bottom-full left-0 mb-2',
		'top start': 'bottom-full left-0 mb-2',
		'top end': 'bottom-full right-0 mb-2',
	} as Record<string, string>,

	/** Slide panel position + sizing per direction */
	slide: {
		right: 'inset-y-0 right-0 h-full w-full',
		left: 'inset-y-0 left-0 h-full w-full',
		top: 'inset-x-0 top-0 w-full',
		bottom: 'inset-x-0 bottom-0 w-full',
	} as Record<string, string>,

	/** Toggle field grid — control (checkbox/radio) leading, label + description trailing */
	toggle: [
		'grid grid-cols-[1.125rem_1fr] gap-x-4 gap-y-1',
		'*:data-[slot=control]:col-start-1 *:data-[slot=control]:row-start-1 *:data-[slot=control]:mt-0.75',
		'*:data-[slot=label]:col-start-2 *:data-[slot=label]:row-start-1',
		'*:data-[slot=description]:col-start-2 *:data-[slot=description]:row-start-2',
		'has-data-[slot=description]:**:data-[slot=label]:font-medium',
	],

	/** Switch field grid — wider leading column for the switch control */
	switch: [
		'grid grid-cols-[2.5rem_1fr] items-center gap-x-4 gap-y-1',
		'*:data-[slot=control]:col-start-1 *:data-[slot=control]:row-start-1',
		'*:data-[slot=label]:col-start-2 *:data-[slot=label]:row-start-1',
		'*:data-[slot=description]:col-start-2 *:data-[slot=description]:row-start-2',
	],

	/** Control group spacing — consistent vertical rhythm for checkbox, radio, switch groups */
	group: [
		'space-y-3 **:data-[slot=label]:font-normal',
		'has-data-[slot=description]:space-y-6 has-data-[slot=description]:**:data-[slot=label]:font-medium',
	],

	/** Icon and avatar slot layout within menu items */
	item: [
		'*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0',
		sumi.textIcon,
		'forced-colors:*:data-[slot=icon]:text-[CanvasText]',
		'*:data-[slot=avatar]:-mx-0.5 *:data-[slot=avatar]:size-6',
	],
}
