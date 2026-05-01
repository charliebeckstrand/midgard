import { sen } from '../sen'
import { take } from '../take'

export const item = [take.icon.md, 'text-inherit', sen.forced.icon]

/** Truncated description with a spacer pseudo-element for overflow. */
export const description = [
	'flex',
	'flex-1',
	'overflow-hidden',
	'before:w-2 before:min-w-0 before:shrink',
]
