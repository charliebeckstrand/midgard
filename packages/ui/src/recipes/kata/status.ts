import { defineRecipe, type VariantPropsOf } from '../../core/recipe'
import { iro } from '../kiso'
export const k = defineRecipe({
	base: 'inline-block rounded-full',
	variant: {
		solid: 'bg-current',
		outline: ['border-2 border-current', ...iro.bg.surface],
	},
	status: {
		inactive: 'text-zinc-300 dark:text-zinc-400',
		active: 'text-green-500',
		info: 'text-blue-500',
		warning: 'text-amber-500',
		error: 'text-red-500',
	},
	pulse: {
		true: 'animate-pulse',
		false: '',
	},
	size: {
		xs: 'size-1.5',
		sm: 'size-2',
		md: 'size-2.5',
		lg: 'size-3',
		xl: 'size-4',
	},
	defaults: {
		variant: 'solid',
		status: 'inactive',
		size: 'md',
		pulse: false,
	},
})

export type StatusDotVariants = VariantPropsOf<typeof k>
