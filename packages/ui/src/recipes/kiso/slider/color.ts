/**
 * Slider archetype: colour palette. The shared `--slider-fill` /
 * `--slider-track` CSS-variable bundle keyed by colour. `<Slider />`
 * paints via a webkit / moz gradient on the native input;
 * `<SliderRange />` paints a dedicated fill element. Both surfaces share
 * this table.
 *
 * Layer: kiso · Archetype: slider · Concern: color
 */

export const color = {
	neutral:
		'[--slider-fill:var(--color-neutral-600)] [--slider-track:var(--color-neutral-200)] dark:[--slider-fill:var(--color-neutral-400)] dark:[--slider-track:var(--color-neutral-700)]',
	danger:
		'[--slider-fill:var(--color-danger-600)] [--slider-track:var(--color-neutral-200)] dark:[--slider-fill:var(--color-danger-500)] dark:[--slider-track:var(--color-neutral-700)]',
	warning:
		'[--slider-fill:var(--color-warning-500)] [--slider-track:var(--color-neutral-200)] dark:[--slider-fill:var(--color-warning-500)] dark:[--slider-track:var(--color-neutral-700)]',
	success:
		'[--slider-fill:var(--color-success-600)] [--slider-track:var(--color-neutral-200)] dark:[--slider-fill:var(--color-success-500)] dark:[--slider-track:var(--color-neutral-700)]',
	primary:
		'[--slider-fill:var(--color-primary-600)] [--slider-track:var(--color-neutral-200)] dark:[--slider-fill:var(--color-primary-500)] dark:[--slider-track:var(--color-neutral-700)]',
} as const
