/**
 * Slider (スライダー) — colour palette.
 *
 * Shared `--slider-fill` / `--slider-track` CSS-variable bundle. `<Slider />`
 * paints the track through a webkit / moz gradient on the native input;
 * `<SliderRange />` paints a dedicated fill element. Different selector
 * surfaces, same variables — so the table lives here rather than forking
 * across kata.
 *
 * Layer: genkei · Concern: slider palette
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
