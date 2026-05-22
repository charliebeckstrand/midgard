import { defineRecipe } from '../../core/recipe'
import { iro, ji, kokkaku, type Step, sun } from '../kiso'

const radiusForStep: Record<Step, 'sm' | 'md' | 'lg'> = {
	sm: sun.sm.radius,
	md: sun.md.radius,
	lg: sun.lg.radius,
}

const title = defineRecipe({
	base: 'font-semibold',
	size: { sm: ji.md, md: ji.lg, lg: ji.xl },
	defaults: { size: 'md' },
})

export const k = {
	skeleton: kokkaku.card,
	radiusForStep,
	header: iro.text.default,
	title,
	description: [ji.sm, iro.text.muted],
}
