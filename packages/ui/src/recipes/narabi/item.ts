import { iro } from '../iro'
import { kyousei } from '../kyousei'
import { take } from '../take'

export const item = [
	iro.text.icon,
	take.icon.md,
	kyousei.icon,
	'*:data-[slot=avatar]:-mx-0.5 *:data-[slot=avatar]:size-6',
]

/** Truncated description with a spacer pseudo-element for overflow. */
export const description = [
	'flex',
	'flex-1',
	'overflow-hidden',
	'before:w-2 before:min-w-0 before:shrink',
]
