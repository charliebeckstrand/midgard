import { omote, sen } from '../kiso'

const { fade } = omote
const { focus } = sen

export const k = {
	// The scroll container of a `rail` row. The `min-w-0` lets the flex child
	// overflow at all. While it overflows, the edge with more fields behind it
	// fades, and the row is a tab stop with an inset ring.
	rail: ['min-w-0 overflow-x-auto overscroll-x-contain', ...fade.inline, ...focus.inset],
} as const
