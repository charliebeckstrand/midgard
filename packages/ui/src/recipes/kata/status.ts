import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { kasane, omote, ugoki } from '../kiso'

export const k = defineRecipe({
	base: ['inline-block', kasane.radius.rounded.full],
	variant: {
		solid: 'bg-current',
		outline: ['border-2 border-current', ...omote.bg.surface],
	},
	status: {
		inactive: mode('text-zinc-300', 'dark:text-zinc-400'),
		active: 'text-green-500',
		info: 'text-blue-500',
		warning: 'text-amber-500',
		error: 'text-red-500',
	},
	pulse: {
		true: ugoki.css.pulse,
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

export type StatusDotVariants = VariantProps<typeof k>
