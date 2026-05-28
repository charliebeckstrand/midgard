import { defineRecipe } from '../../core/recipe'
import { iro, ji, kokkaku, type Step, sun } from '../kiso'

const radius = {
	sm: sun.sm.radius,
	md: sun.md.radius,
	lg: sun.lg.radius,
} as const satisfies Record<Step, 'sm' | 'md' | 'lg'>

const title = defineRecipe({
	base: ji.weight.semibold,
	size: { sm: ji.size.md, md: ji.size.lg, lg: ji.size.xl },
	defaults: { size: 'md' },
})

export const k = {
	skeleton: kokkaku.card,
	radius,
	header: iro.text.default,
	title,
	description: [ji.size.sm, iro.text.muted],
} as const
