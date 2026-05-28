import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { hannou, kasane, ugoki } from '../kiso'
import { slider } from '../kiso/slider'

const { color } = slider

const root = defineRecipe({
	base: ['relative', 'w-full', ...hannou.cursor, 'select-none', 'touch-none', hannou.disabled],
	size: {
		sm: 'py-3',
		md: 'py-4',
		lg: 'py-5',
	},
	color,
	defaults: { size: 'md', color: 'blue' },
})

const track = defineRecipe({
	base: ['absolute left-0 right-0', kasane.rounded.full, 'bg-[var(--slider-track)]'],
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
		kasane.rounded.full,
		'-translate-x-1/2',
		'bg-white',
		...mode('ring-1 ring-zinc-950/20', 'dark:ring-white/20'),
		'shadow-sm',
		ugoki.css.transform,
		'hover:scale-110',
		'active:scale-110',
		'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600',
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
	fill: ['absolute', kasane.rounded.full, 'bg-[var(--slider-fill)]'],
	thumb,
} as const

export type RangeSliderVariants = VariantProps<typeof root>
