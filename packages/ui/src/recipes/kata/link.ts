import { defineRecipe, type VariantProps } from '../../core/recipe'

export const k = defineRecipe({
	color: {
		current: 'text-current dark:text-current',
		zinc: 'text-zinc-600 dark:text-zinc-400',
		red: 'text-red-600 dark:text-red-500',
		amber: 'text-amber-500 dark:text-amber-400',
		green: 'text-green-600 dark:text-green-500',
		blue: 'text-blue-600 dark:text-blue-500',
	},
	defaults: { color: 'blue' },
})

export type LinkVariants = VariantProps<typeof k>
