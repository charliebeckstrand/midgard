import { kasane, omote, ugoki } from '../kiso'

const { rounded } = kasane
const { bg } = omote
const { css } = ugoki

export const k = {
	fill: bg.skeleton.base,
	// Apart from the fill and the shape, so a placeholder can stay still.
	pulse: css.pulse,
	// The default height ranks below each density step and each plain class,
	// so a skeleton replaces it with either.
	shape: ['block density-any:h-4', rounded.lg],
} as const
