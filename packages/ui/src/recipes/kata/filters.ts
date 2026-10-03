import { omote } from '../kiso'

const { fade } = omote

export const k = {
	// The scroll container of a `rail` row. The `min-w-0` lets the flex child
	// overflow at all. While it overflows, the edge with more fields behind it
	// fades.
	rail: ['min-w-0 overflow-x-auto overscroll-x-contain', ...fade.inline],
} as const
