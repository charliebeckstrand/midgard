/**
 * Slider (スライダー) — colour palette.
 *
 * Shared `--slider-fill` / `--slider-track` CSS-variable bundle consumed by
 * both single-thumb `<Slider />` (paints the track via a webkit / moz
 * gradient on the native input) and multi-thumb `<SliderRange />` (paints a
 * dedicated fill element). The two implementations differ in selector
 * surface but read the same variables, so promoting the colour table to
 * genkei keeps them visually identical without a kata-to-kata fork.
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
