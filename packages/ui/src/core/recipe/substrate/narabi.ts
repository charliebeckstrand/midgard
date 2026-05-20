/**
 * Narabi (並び) — arrangement.
 *
 * Ordering, positioning, and slot relationships between siblings.
 *
 * Layer: ryū · Concern: layout
 */

import { iro } from './iro'
import { ji } from './ji'
import { sen } from './sen'
import { take } from './take'

const field = [
	'*:data-[slot=label]:font-medium',
	'[&>[data-slot=label]+[data-slot]]:mt-1',
	'[&>[data-slot=description]+[data-slot]]:mt-1',
	'[&>[data-slot=control]+[data-slot]]:mt-2',
	'[&>[data-slot=control-frame]+[data-slot]]:mt-2',
	'[&>[data-slot=field]+[data-slot]]:mt-2',
	'[&>[data-slot=field]+[role=alert]]:mt-2',
]

const item = [take.icon.md, 'text-inherit', sen.forced.icon]

/** Truncated description with a spacer pseudo-element for overflow. */
const description = ['flex', 'flex-1', 'overflow-hidden', 'before:w-2 before:min-w-0 before:shrink']

/** Panel slot layout shared by dialog and sheet. */
const panel = {
	base: 'flex flex-col',
	title: [...iro.text.default, ji.size.lg, 'font-semibold leading-none'],
	description: [...iro.text.muted, ji.size.md, 'mt-2 first:mt-0'],
	body: [...iro.text.muted, 'min-h-0', 'mt-4 first:mt-0', 'overflow-y-auto'],
	actions: ['flex items-center justify-end', 'mt-6 first:mt-0', 'gap-2'],
}

const slide = {
	right: 'inset-y-0 right-0 h-full w-full',
	left: 'inset-y-0 left-0 h-full w-full',
	top: 'inset-x-0 top-0 w-full',
	bottom: 'inset-x-0 bottom-0 w-full',
} as Record<string, string>

const toggle = [
	'group/field grid grid-cols-[1.125rem_1fr]',
	'gap-x-2',
	'*:data-[slot=control]:col-start-1 *:data-[slot=control]:row-start-1 *:data-[slot=control]:self-center',
	'*:data-[slot=label]:col-start-2 *:data-[slot=label]:row-start-1',
	'*:data-[slot=description]:col-start-2 *:data-[slot=description]:row-start-2',
	'has-data-[slot=description]:**:data-[slot=label]:font-medium',
	'has-disabled:**:data-[slot]:cursor-not-allowed',
]

const group = [
	'[&>[data-slot=field]+[data-slot=field]]:mt-2',
	'[&>[data-slot=label]+[data-slot=field]]:mt-4',
	'**:data-[slot=label]:font-normal',
	'has-data-[slot=description]:**:data-[slot=label]:font-medium',
]

export const narabi = {
	field,
	slide,
	toggle,
	group,
	item,
	description,
	panel,
} as const
