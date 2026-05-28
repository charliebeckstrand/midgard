import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { iro, kokkaku } from '../kiso'

export const k = defineRecipe({
	variant: {
		default: [...iro.text.default],
		primary: [...iro.text.primary],
		success: [...iro.text.success],
		warning: [...iro.text.warning],
		error: [...iro.text.error],
		muted: [...iro.text.muted],
	},
	color: {
		current: mode('text-current', 'dark:text-current'),
		zinc: mode('text-zinc-600', 'dark:text-zinc-400'),
		red: mode('text-red-600', 'dark:text-red-500'),
		amber: mode('text-amber-500', 'dark:text-amber-400'),
		green: mode('text-green-600', 'dark:text-green-500'),
		blue: mode('text-blue-600', 'dark:text-blue-500'),
	},
	defaults: { variant: 'default' },
	skeleton: kokkaku.text,
})

export type TextVariants = VariantProps<typeof k>
