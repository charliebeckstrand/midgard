import { tv, type VariantProps } from 'tailwind-variants'
import { iro, ji } from '../../core/recipe'

export const statValue = tv({
	base: ['font-semibold tracking-tight tabular-nums', ...iro.text.default],
	variants: {
		size: {
			sm: ji.size['2xl'],
			md: ji.size['3xl'],
			lg: ji.size['4xl'],
		},
	},
	defaultVariants: { size: 'md' },
})

export const statDelta = tv({
	base: ['inline-flex items-center', ji.size.sm, 'gap-xs', 'font-medium tabular-nums'],
	variants: {
		trend: {
			up: 'text-green-600 dark:text-green-500',
			down: 'text-red-600 dark:text-red-500',
			neutral: [...iro.text.muted],
		},
	},
	defaultVariants: { trend: 'neutral' },
})

/**
 * Skeleton placeholder dimensions for each Stat slot. Heights are tuned to the
 * text line-height of the live element so wrapping a `<Stat>` in `<Skeleton>`
 * doesn't shift layout. Widths are sensible defaults — caller can override via
 * `className`.
 */
export const statValuePlaceholder = tv({
	base: '',
	variants: {
		size: {
			sm: 'h-8 w-16',
			md: 'h-9 w-20',
			lg: 'h-10 w-24',
		},
	},
	defaultVariants: { size: 'md' },
})

export const statLabelPlaceholder = tv({
	base: '',
	variants: {
		size: {
			sm: 'h-4 w-20',
			md: 'h-5 w-24',
			lg: 'h-6 w-28',
		},
	},
	defaultVariants: { size: 'md' },
})

export const statPlaceholder = {
	description: 'h-5 w-20',
	delta: 'h-5 w-12',
}

const label = tv({
	base: [...iro.text.muted, 'font-medium'],
	variants: {
		size: {
			sm: ji.size.xs,
			md: ji.size.sm,
			lg: ji.size.md,
		},
	},
	defaultVariants: { size: 'md' },
})

export type StatValueVariants = VariantProps<typeof statValue>
export type StatDeltaVariants = VariantProps<typeof statDelta>

export const k = {
	base: ['flex flex-col justify-center', 'h-full', 'gap-xs'],
	label,
	description: [ji.size.sm, ...iro.text.muted],
}

export { statDelta as statDeltaVariants, statValue as statValueVariants }
