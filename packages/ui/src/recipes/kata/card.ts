import { defineRecipe } from '../../core/recipe'
import { iro, ji, kokkaku, type Step, sun } from '../kiso'

const { text } = iro
const { size, weight } = ji

const radius = {
	sm: sun.sm.radius,
	md: sun.md.radius,
	lg: sun.lg.radius,
} as const satisfies Record<Step, 'sm' | 'md' | 'lg'>

const title = defineRecipe({
	base: weight.semibold,
	size: { sm: size.md, md: size.lg, lg: size.xl },
	defaults: { size: 'md' },
})

export const k = {
	skeleton: kokkaku.card,
	radius,
	header: text.default,
	title,
	description: [size.sm, text.muted],
} as const
