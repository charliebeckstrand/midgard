/**
 * Narabi (並び) — Arrangement.
 *
 * How elements line up — the ordering, positioning, and slot relationships
 * between siblings. The choreography of a layout.
 *
 * Tier: 2
 * Concern: layout
 */

import { sumi } from './sumi'
import { take } from './take'

// ── Motoi (基) ──────────────────────────────────────────
export const narabi = {
	field: [
		'[&>[data-slot=label]+[data-slot=control]]:mt-2',
		'[&>[data-slot=label]+[data-slot=description]]:mt-1',
		'[&>[data-slot=description]+[data-slot=control]]:mt-2',
		'[&>[data-slot=control]+[data-slot=description]]:mt-2',
		'[&>[data-slot=control]+[data-slot=error]]:mt-2',
		'*:data-[slot=label]:font-medium',
	],

	anchor: {
		bottom: 'top-full left-0 mt-2',
		'bottom start': 'top-full left-0 mt-2',
		'bottom end': 'top-full right-0 mt-2',
		top: 'bottom-full left-0 mb-2',
		'top start': 'bottom-full left-0 mb-2',
		'top end': 'bottom-full right-0 mb-2',
		left: 'right-full top-1/2 -translate-y-1/2 mr-2',
		right: 'left-full top-1/2 -translate-y-1/2 ml-2',
	} as Record<string, string>,

	slide: {
		right: 'inset-y-0 right-0 h-full w-full',
		left: 'inset-y-0 left-0 h-full w-full',
		top: 'inset-x-0 top-0 w-full',
		bottom: 'inset-x-0 bottom-0 w-full',
	} as Record<string, string>,

	toggle: [
		'grid grid-cols-[1.125rem_1fr] gap-x-4 gap-y-1',
		'*:data-[slot=control]:col-start-1 *:data-[slot=control]:row-start-1 *:data-[slot=control]:mt-0.75',
		'*:data-[slot=label]:col-start-2 *:data-[slot=label]:row-start-1',
		'*:data-[slot=description]:col-start-2 *:data-[slot=description]:row-start-2',
		'has-data-[slot=description]:**:data-[slot=label]:font-medium',
		'has-disabled:**:data-[slot=label]:cursor-not-allowed',
	],

	group: [
		'space-y-3 **:data-[slot=label]:font-normal',
		'has-data-[slot=description]:**:data-[slot=label]:font-medium',
	],

	item: [
		sumi.textIcon,
		take.iconSlot.md,
		'*:data-[slot=avatar]:-mx-0.5 *:data-[slot=avatar]:size-6',
		'forced-colors:*:data-[slot=icon]:text-[CanvasText]',
	],

	/** Truncated description with a spacer pseudo-element. */
	description: 'flex flex-1 overflow-hidden before:w-2 before:min-w-0 before:shrink',

	/** End-aligned icon slot inside a relative input container. */
	chevron: 'absolute inset-y-0 right-0 flex items-center pr-2',
} as const
