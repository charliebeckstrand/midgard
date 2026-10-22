import { defineKata } from '../../core/recipe'
import { kasane, omote, ugoki } from '../kiso'

const { rounded } = kasane
const { bg } = omote
const { css } = ugoki

export const k = defineKata({
	// The default height ranks below each density step and each plain class,
	// so a skeleton replaces it with either.
	base: [bg.skeleton.base, 'block density-any:h-4', rounded.lg],
	// An axis apart from the fill and the shape, so a placeholder can stay still.
	pulse: { true: css.pulse, false: '' },
})
