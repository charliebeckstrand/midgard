/**
 * Narabi description — truncated description layout with a spacer
 * pseudo-element for overflow. The leading `before:w-2` lets the text
 * shrink past the parent edge before truncating, so the ellipsis lands
 * inside the visible row rather than at the chrome boundary.
 *
 * Layer: kiso · Concern: truncated description layout
 */

export const description = [
	'flex',
	'flex-1',
	'overflow-hidden',
	'before:w-2 before:min-w-0 before:shrink',
]
