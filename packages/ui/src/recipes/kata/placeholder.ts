import { kasane, omote } from '../kiso'

const { rounded } = kasane
const { skeleton } = omote

export const k = {
	// The default height ranks below each density step and each plain class,
	// so a skeleton replaces it with either.
	base: [skeleton, 'block density-any:h-4', rounded.lg],
} as const
