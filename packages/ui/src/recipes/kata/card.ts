import { iro, ji, ma, type Step, sun } from '../kiso'

const { text } = iro
const { size } = ji
const { p } = ma

/**
 * Density-keyed body padding from `ma.p`: sm → p-2, md → p-3, lg → p-4.
 * Header / footer compose their own padding; this is the body slot.
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

export const k = {
	radius,
	bodyPadding,
	header: text.default,
	description: [size.sm, text.muted],
} as const
