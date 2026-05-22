import { defineRecipe, type VariantPropsOf } from '../../core/recipe'
import { iro, ji } from '../kiso'

const label = defineRecipe({
	base: [...iro.text.muted, 'font-medium'],
	size: {
		sm: ji.xs,
		md: ji.sm,
		lg: ji.md,
	},
	defaults: { size: 'md' },
})

const value = defineRecipe({
	base: ['font-semibold tracking-tight tabular-nums', ...iro.text.default],
	size: {
		sm: ji['2xl'],
		md: ji['3xl'],
		lg: ji['4xl'],
	},
	defaults: { size: 'md' },
})

const delta = defineRecipe({
	base: ['inline-flex items-center', ji.sm, 'gap-xs', 'font-medium tabular-nums'],
	trend: {
		up: 'text-green-600 dark:text-green-500',
		down: 'text-red-600 dark:text-red-500',
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
		base: ['flex flex-col justify-center', 'h-full', 'gap-xs'],
		slots: {
			description: [ji.sm, ...iro.text.muted],
		},
	},
	{
		label,
		value,
		delta,
		skeleton,
	},
)

export type StatValueVariants = VariantPropsOf<typeof value>
export type StatDeltaVariants = VariantPropsOf<typeof delta>
