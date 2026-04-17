import { kyousei } from '../kyousei'
import { sumi } from '../sumi'
import { take } from '../take'

export const item = [
	sumi.textIcon,
	take.iconSlot.md,
	'*:data-[slot=avatar]:-mx-0.5 *:data-[slot=avatar]:size-6',
	kyousei.icon,
]

/** Truncated description with a spacer pseudo-element for overflow. */
export const description = [
	'flex',
	'flex-1',
	'overflow-hidden',
	'before:w-2 before:min-w-0 before:shrink',
]
