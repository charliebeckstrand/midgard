/**
 * Narabi description: truncated description layout with a spacer
 * pseudo-element for overflow. The leading `before:w-2` shrinks before
 * the text truncates, landing the ellipsis inside the visible row.
 *
 * Layer: kiso · Concern: truncated description layout
 */

export const description = [
	'flex',
	'flex-1',
	'overflow-hidden',
	'before:w-2 before:min-w-0 before:shrink',
]
