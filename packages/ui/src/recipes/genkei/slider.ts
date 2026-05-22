/**
 * Slider colour palette — shared `--slider-fill` / `--slider-track` variable
 * bundle. `<Slider />` paints via a webkit / moz gradient on the native input;
 * `<SliderRange />` paints a dedicated fill element. Same variables, different
 * surfaces — so the table lives here rather than forking across kata.
 */

export const slider = {
	color: {
		zinc: '[--slider-fill:var(--color-zinc-600)] [--slider-track:var(--color-zinc-200)] dark:[--slider-fill:var(--color-zinc-400)] dark:[--slider-track:var(--color-zinc-700)]',
		red: '[--slider-fill:var(--color-red-600)] [--slider-track:var(--color-zinc-200)] dark:[--slider-fill:var(--color-red-500)] dark:[--slider-track:var(--color-zinc-700)]',
		amber:
			'[--slider-fill:var(--color-amber-500)] [--slider-track:var(--color-zinc-200)] dark:[--slider-fill:var(--color-amber-500)] dark:[--slider-track:var(--color-zinc-700)]',
		green:
			'[--slider-fill:var(--color-green-600)] [--slider-track:var(--color-zinc-200)] dark:[--slider-fill:var(--color-green-500)] dark:[--slider-track:var(--color-zinc-700)]',
		blue: '[--slider-fill:var(--color-blue-600)] [--slider-track:var(--color-zinc-200)] dark:[--slider-fill:var(--color-blue-500)] dark:[--slider-track:var(--color-zinc-700)]',
	},
} as const
