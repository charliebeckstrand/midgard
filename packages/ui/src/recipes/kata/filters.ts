import { omote } from '../kiso'

const { rail } = omote

export const k = {
	// The scroll container of a `rail` row. While it overflows, the edge with
	// more fields behind it fades, and the row is a tab stop with an inset ring.
	rail: [...rail],
} as const
