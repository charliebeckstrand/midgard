import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { iro, ji, narabi } from '../kiso'

const label = defineRecipe({
	base: [...iro.text.muted, ji.weight.medium],
	size: {
		sm: ji.size.xs,
		md: ji.size.sm,
		lg: ji.size.md,
	},
	defaults: { size: 'md' },
})

const value = defineRecipe({
	base: [ji.weight.semibold, 'tracking-tight tabular-nums', ...iro.text.default],
	size: {
		sm: ji.size['2xl'],
		md: ji.size['3xl'],
		lg: ji.size['4xl'],
	},
	defaults: { size: 'md' },
})

const delta = defineRecipe({
	base: [narabi.inlineRow, ji.size.sm, 'gap-1', ji.weight.medium, 'tabular-nums'],
	trend: {
		up: mode('text-green-600', 'dark:text-green-500'),
		down: mode('text-red-600', 'dark:text-red-500'),
		neutral: [...iro.text.muted],
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
		base: [narabi.col, 'justify-center', 'h-full', 'gap-1'],
		slots: {
			description: [ji.size.sm, ...iro.text.muted],
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
