import { defineRecipe, sawari, type VariantPropsOf } from '../../core/recipe'

const root = defineRecipe({
	base: ['relative', 'w-full', ...sawari.cursor, 'select-none', 'touch-none', sawari.disabled],
	size: {
		sm: 'py-3',
		md: 'py-4',
		lg: 'py-5',
	},
	color: {
		zinc: '[--slider-fill:var(--color-zinc-600)] [--slider-track:var(--color-zinc-200)] dark:[--slider-fill:var(--color-zinc-400)] dark:[--slider-track:var(--color-zinc-700)]',
		red: '[--slider-fill:var(--color-red-600)] [--slider-track:var(--color-zinc-200)] dark:[--slider-fill:var(--color-red-500)] dark:[--slider-track:var(--color-zinc-700)]',
		amber:
			'[--slider-fill:var(--color-amber-500)] [--slider-track:var(--color-zinc-200)] dark:[--slider-fill:var(--color-amber-500)] dark:[--slider-track:var(--color-zinc-700)]',
		green:
			'[--slider-fill:var(--color-green-600)] [--slider-track:var(--color-zinc-200)] dark:[--slider-fill:var(--color-green-500)] dark:[--slider-track:var(--color-zinc-700)]',
		blue: '[--slider-fill:var(--color-blue-600)] [--slider-track:var(--color-zinc-200)] dark:[--slider-fill:var(--color-blue-500)] dark:[--slider-track:var(--color-zinc-700)]',
	},
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
