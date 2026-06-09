import { iro, ji, ma, type Step, sun } from '../kiso'

const { text } = iro
const { size } = ji
const { gap, p, pb, pt, px } = ma

/**
 * Density-keyed body padding from `ma.p`: sm → p-2, md → p-3, lg → p-4.
 * Header / footer pad three sides via the directional maps below; the edge
 * facing the body stays open so the body slot closes the box.
 */
const bodyPadding = {
	sm: p.sm,
	md: p.md,
	lg: p.lg,
} as const satisfies Record<Step, string>

const headerPadding = {
	sm: [px.sm, pt.sm, 'pb-0'],
	md: [px.md, pt.md, 'pb-0'],
	lg: [px.lg, pt.lg, 'pb-0'],
} as const satisfies Record<Step, readonly string[]>

const footerPadding = {
	sm: [px.sm, pb.sm, 'pt-0'],
	md: [px.md, pb.md, 'pt-0'],
	lg: [px.lg, pb.lg, 'pt-0'],
} as const satisfies Record<Step, readonly string[]>

// One step tighter than `ma.gap` at each density — footer actions sit close.
const footerGap = {
	sm: gap.xs,
	md: gap.sm,
	lg: gap.md,
} as const satisfies Record<Step, string>

const radius = {
	sm: sun.sm.radius,
	md: sun.md.radius,
	lg: sun.lg.radius,
} as const satisfies Record<Step, 'sm' | 'md' | 'lg'>

export const k = {
	radius,
	bodyPadding,
	headerPadding,
	footerPadding,
	footerGap,
	header: text.default,
	description: [size.sm, text.muted],
} as const
