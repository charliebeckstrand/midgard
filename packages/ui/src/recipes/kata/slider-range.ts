import { defineRecipe, hannou, type VariantPropsOf } from '..'
import { slider } from '../genkei/slider'

const root = defineRecipe({
	base: ['relative', 'w-full', ...hannou.cursor, 'select-none', 'touch-none', hannou.disabled],
	size: {
		sm: 'py-3',
		md: 'py-4',
		lg: 'py-5',
	},
	color: slider.color,
	defaults: { size: 'md', color: 'blue' },
})

const track = defineRecipe({
	base: ['absolute', 'left-0', 'right-0', 'rounded-full', 'bg-[var(--slider-track)]'],
	size: {
		sm: 'h-1',
		md: 'h-1.5',
		lg: 'h-2',
	},
	defaults: { size: 'md' },
})

const thumb = defineRecipe({
	base: [
		'absolute',
		'rounded-full',
		'-translate-x-1/2',
		// Color (light)
		'bg-white',
		'ring-1 ring-zinc-950/20',
		// Color (dark)
		'dark:ring-white/20',
		// Effects
		'shadow-sm',
		// Transition
		'transition-transform',
		// Hover
		'hover:scale-110',
		// Active
		'active:scale-110',
		// Focus
		'focus-visible:outline-none',
		'focus-visible:ring-4',
		'focus-visible:ring-blue-600',
		'dark:focus-visible:ring-blue-600',
	],
	size: {
		sm: 'size-3',
		md: 'size-4',
		lg: 'size-5',
	},
	defaults: { size: 'md' },
})

export const k = {
	root,
	track,
	fill: ['absolute', 'rounded-full', 'bg-[var(--slider-fill)]'],
	thumb,
}

export type RangeSliderVariants = VariantPropsOf<typeof root>
