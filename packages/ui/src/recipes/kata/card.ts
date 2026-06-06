import { defineRecipe } from '../../core/recipe'
import { iro, ji, ma, type Step, sun } from '../kiso'

const { text } = iro
const { size, weight } = ji
const { p } = ma

/**
 * Density-keyed body padding, funnelled from `ma.p` (the single source of
 * truth) so `<CardBody>` tracks the ambient density axis: sm → p-2, md → p-3,
 * lg → p-4. Header / footer compose their own padding; this is the body slot.
 */
const bodyPadding = {
	sm: p.sm,
	md: p.md,
	lg: p.lg,
} as const satisfies Record<Step, string>

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
	radius,
	bodyPadding,
	header: text.default,
	title,
	description: [size.sm, text.muted],
} as const
