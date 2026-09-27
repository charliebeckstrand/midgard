import { kasane, omote } from '../kiso'

const { rounded } = kasane
const { skeleton } = omote

export const k = {
	// The default height is a `density-*` class at each step, so a skeleton
	// that sizes by density steps replaces it step by step. A plain `h-*` class
	// wins over each step, so a skeleton that sizes by plain classes needs no
	// change.
	base: [
		skeleton,
		'block',
		'density-xs:h-4 density-sm:h-4 density-md:h-4 density-lg:h-4 density-xl:h-4',
		rounded.lg,
	],
} as const
