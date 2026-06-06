import { defineRecipe, type VariantProps } from '../../core/recipe'
import { iro, ji, narabi } from '../kiso'

const { text } = iro
const { size, weight } = ji
const { flex } = narabi

const label = defineRecipe({
	base: [...text.muted, weight.medium],
	size: {
		sm: size.xs,
		md: size.sm,
		lg: size.md,
	},
	defaults: { size: 'md' },
})

const value = defineRecipe({
	base: [weight.semibold, 'tracking-tight tabular-nums', ...text.default],
	size: {
		sm: size['2xl'],
		md: size['3xl'],
		lg: size['4xl'],
	},
	defaults: { size: 'md' },
})

const delta = defineRecipe({
	base: [flex.inline, size.sm, 'gap-1', weight.medium, 'tabular-nums'],
	trend: {
		up: text.success,
		down: text.error,
		neutral: text.muted,
	},
	defaults: { trend: 'neutral' },
})

/**
 * Skeleton placeholder dimensions for each Stat slot. Heights are tuned to the
 * text line-height of the live element so wrapping a `<Stat>` in `<Skeleton>`
 * doesn't shift layout. Widths are sensible defaults — caller can override via
 * `className`.
 */
const skeleton = {
	value: defineRecipe({
		base: '',
		size: {
			sm: 'h-8 w-16',
			md: 'h-9 w-20',
			lg: 'h-10 w-24',
		},
		defaults: { size: 'md' },
	}),
	label: defineRecipe({
		base: '',
		size: {
			sm: 'h-4 w-20',
			md: 'h-5 w-24',
			lg: 'h-6 w-28',
		},
		defaults: { size: 'md' },
	}),
	description: 'h-5 w-20',
	delta: 'h-5 w-12',
}

export const k = defineRecipe(
	{
		base: [flex.col, 'justify-center', 'h-full', 'gap-1'],
		slots: {
			description: [size.sm, ...text.muted],
		},
		skeleton,
	},
	{
		label,
		value,
		delta,
	},
)

export type StatValueVariants = VariantProps<typeof value>
export type StatDeltaVariants = VariantProps<typeof delta>
