import { yasumi } from '../yasumi'

export const slider = {
	base: [
		'w-full appearance-none bg-transparent cursor-pointer outline-none',

		yasumi.disabled,

		// ── WebKit track ─────────────────────────────────
		// --slider-value is set inline (0–100 %); --slider-fill / --slider-track come from the color variant.
		'[&::-webkit-slider-runnable-track]:w-full',
		'[&::-webkit-slider-runnable-track]:rounded-full',
		'[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--slider-fill)_0,var(--slider-fill)_var(--slider-value,0%),var(--slider-track)_var(--slider-value,0%),var(--slider-track)_100%)]',

		// ── WebKit thumb ─────────────────────────────────
		'[&::-webkit-slider-thumb]:appearance-none',
		'[&::-webkit-slider-thumb]:rounded-full',
		'[&::-webkit-slider-thumb]:bg-white',
		'[&::-webkit-slider-thumb]:ring-1 [&::-webkit-slider-thumb]:ring-zinc-950/20',
		'dark:[&::-webkit-slider-thumb]:ring-white/20',
		'[&::-webkit-slider-thumb]:shadow-sm',
		'[&::-webkit-slider-thumb]:transition-transform',
		'hover:not-disabled:[&::-webkit-slider-thumb]:scale-110',
		'active:not-disabled:[&::-webkit-slider-thumb]:scale-110',
		'focus-visible:[&::-webkit-slider-thumb]:ring-2',
		'focus-visible:[&::-webkit-slider-thumb]:ring-blue-600',
		'dark:focus-visible:[&::-webkit-slider-thumb]:ring-blue-600',

		// ── Firefox track ────────────────────────────────
		'[&::-moz-range-track]:w-full',
		'[&::-moz-range-track]:rounded-full',
		'[&::-moz-range-track]:bg-[linear-gradient(to_right,var(--slider-fill)_0,var(--slider-fill)_var(--slider-value,0%),var(--slider-track)_var(--slider-value,0%),var(--slider-track)_100%)]',

		// ── Firefox thumb ────────────────────────────────
		'[&::-moz-range-thumb]:rounded-full',
		'[&::-moz-range-thumb]:bg-white',
		'[&::-moz-range-thumb]:border-0',
		'[&::-moz-range-thumb]:ring-1 [&::-moz-range-thumb]:ring-zinc-950/20',
		'dark:[&::-moz-range-thumb]:ring-white/20',
		'[&::-moz-range-thumb]:shadow-sm',
		'[&::-moz-range-thumb]:transition-transform',
		'hover:not-disabled:[&::-moz-range-thumb]:scale-110',
		'active:not-disabled:[&::-moz-range-thumb]:scale-110',
		'focus-visible:[&::-moz-range-thumb]:ring-2',
		'focus-visible:[&::-moz-range-thumb]:ring-blue-600',
		'dark:focus-visible:[&::-moz-range-thumb]:ring-blue-600',
	],
	size: {
		// Vertical padding extends the native hit area without changing the visible thumb size.
		sm: [
			'py-4',
			'[&::-webkit-slider-runnable-track]:h-1',
			'[&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:-mt-1',
			'[&::-moz-range-track]:h-1',
			'[&::-moz-range-thumb]:size-3',
		],
		md: [
			'py-5',
			'[&::-webkit-slider-runnable-track]:h-1.5',
			'[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:-mt-[5px]',
			'[&::-moz-range-track]:h-1.5',
			'[&::-moz-range-thumb]:size-4',
		],
		lg: [
			'py-6',
			'[&::-webkit-slider-runnable-track]:h-2',
			'[&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:-mt-[6px]',
			'[&::-moz-range-track]:h-2',
			'[&::-moz-range-thumb]:size-5',
		],
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
