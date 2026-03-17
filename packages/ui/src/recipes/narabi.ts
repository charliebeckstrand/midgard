/**
 * Narabi (並び) — Arrangement.
 *
 * How elements line up — the ordering, positioning, and slot relationships
 * between siblings. The choreography of a layout.
 *
 * Branch of: Ma (root)
 * Concern: layout, positioning
 */

import { katachi } from './katachi'

export const narabi = {
	/** How form field slots relate — label → control → description → error */
	field: [
		'[&>[data-slot=label]+[data-slot=control]]:mt-3',
		'[&>[data-slot=label]+[data-slot=description]]:mt-1',
		'[&>[data-slot=description]+[data-slot=control]]:mt-3',
		'[&>[data-slot=control]+[data-slot=description]]:mt-3',
		'[&>[data-slot=control]+[data-slot=error]]:mt-3',
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

	/** Icon and avatar slot layout within menu items */
	item: [
		// Icon sizing — from shared recipe
		...katachi.iconSlot,
		// Icon colors — secondary text color applied to icon slot
		'*:data-[slot=icon]:text-zinc-500 dark:*:data-[slot=icon]:text-zinc-400',
		// Icon colors — focus
		'group-focus/option:*:data-[slot=icon]:text-white',
		// Icon colors — forced colors
		'forced-colors:*:data-[slot=icon]:text-[CanvasText]',
		'forced-colors:group-focus/option:*:data-[slot=icon]:text-[Canvas]',
		// Avatar sizing
		'*:data-[slot=avatar]:-mx-0.5 *:data-[slot=avatar]:size-6 sm:*:data-[slot=avatar]:size-5',
	],
}
