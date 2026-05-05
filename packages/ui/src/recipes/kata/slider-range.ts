import { sawari } from '../ryu/sawari'

export const sliderRange = {
	root: ['relative', 'w-full', ...sawari.cursor, 'select-none', 'touch-none', sawari.disabled],
	track: ['absolute', 'left-0', 'right-0', 'rounded-full', 'bg-[var(--slider-track)]'],
	fill: ['absolute', 'rounded-full', 'bg-[var(--slider-fill)]'],
	thumb: [
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
		sm: {
			root: 'py-3',
			track: 'h-1',
			thumb: 'size-3',
		},
		md: {
			root: 'py-4',
			track: 'h-1.5',
			thumb: 'size-4',
		},
		lg: {
			root: 'py-5',
			track: 'h-2',
			thumb: 'size-5',
		},
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
	defaults: { size: 'md' as const, color: 'blue' as const },
}
