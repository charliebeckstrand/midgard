import { iro, ji, ma, type Step, sun } from '../kiso'

const { text } = iro
const { size } = ji
const { gap, p, pb, pt, px } = ma

/**
 * Density-keyed body padding from `ma.p`: sm → p-2, md → p-3, lg → p-4.
 * Header / footer pad three sides via the directional maps below; the edge
 * facing the body stays open and the body slot closes the box.
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

// One step tighter than `ma.gap` at each density; footer actions sit close.
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

/**
 * Card-side projections that keep direct-child sections in step with a
 * non-md `size`. Sections are static leaves carrying their own md padding;
 * the card overrides the step-varying properties from outside. Direct-child
 * selectors keep nested cards independent. md has no row: at the default
 * step the section's own classes already match, and a consumer `className`
 * on a section keeps overriding them. The `px`/`pt`/`p`/`gap` values mirror
 * the `ma`-derived header/footer/body maps above; they're written as literals
 * (not projected from `ma`) because Tailwind emits a `*:data-[slot=…]:`
 * variant only where it scans the full class.
 */
const sections = {
	sm: [
		'*:data-[slot=card-header]:px-2',
		'*:data-[slot=card-header]:pt-2',
		'*:data-[slot=card-body]:p-2',
		'*:data-[slot=card-footer]:px-2',
		'*:data-[slot=card-footer]:pb-2',
		'*:data-[slot=card-footer]:gap-1',
	],
	md: [],
	lg: [
		'*:data-[slot=card-header]:px-4',
		'*:data-[slot=card-header]:pt-4',
		'*:data-[slot=card-body]:p-4',
		'*:data-[slot=card-footer]:px-4',
		'*:data-[slot=card-footer]:pb-4',
		'*:data-[slot=card-footer]:gap-3',
	],
} as const satisfies Record<Step, readonly string[]>

export const k = {
	radius,
	bodyPadding,
	headerPadding,
	footerPadding,
	footerGap,
	sections,
	header: text.default,
	description: [size.sm, text.muted],
} as const
