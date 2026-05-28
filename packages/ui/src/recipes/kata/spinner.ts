import { defineRecipe, mode, type VariantProps } from '../../core/recipe'

export const k = defineRecipe({
	base: 'inline-block shrink-0 animate-spin',
	size: {
		xs: 'size-3',
		sm: 'size-4',
		md: 'size-5',
		lg: 'size-6',
		xl: 'size-8',
	},
	color: {
		current: 'text-current',
		zinc: mode('text-zinc-600', 'dark:text-zinc-400'),
		red: mode('text-red-600', 'dark:text-red-500'),
		amber: 'text-amber-500',
		green: mode('text-green-600', 'dark:text-green-500'),
		blue: mode('text-blue-600', 'dark:text-blue-500'),
	},
	defaults: { size: 'md', color: 'current' },
})

export type SpinnerVariants = VariantProps<typeof k>
