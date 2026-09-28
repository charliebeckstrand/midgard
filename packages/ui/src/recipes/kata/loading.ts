import type { DensityStep } from '../../core/density'
import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { iro, narabi } from '../kiso'

const { marker } = iro
const { flex } = narabi

/**
 * Indicator color, shared by both loading surfaces. Resolves to a `text-*`
 * class; dots (`bg-current`) and the spinner SVG (`currentColor`) both inherit
 * it. Chromatic colors use the `iro.marker` shade (600 light / 500 dark),
 * which clears non-text 3:1 on the page. `current` inherits the surrounding
 * text color; `zinc` uses its stronger neutral.
 */
const color = {
	current: 'text-current',
	zinc: mode('text-zinc-600', 'dark:text-zinc-400'),
	red: marker.red,
	amber: marker.amber,
	green: marker.green,
	blue: marker.blue,
}

/**
 * A single ellipsis dot. The pulse animation is `motion-safe:`-gated, resting
 * as a steady dot under `prefers-reduced-motion` (WCAG 2.3.3). The diameter is
 * a stepped `density-*` class, so the dot takes the step of its nearest
 * density scope, as the spinner does.
 */
const dot = defineRecipe({
	base: [
		'shrink-0 rounded-full bg-current',
		'motion-safe:animate-pulse',
		'density-size-[1,1.5,2,2.5,3]',
	],
})

/**
 * Rotating SVG indicator: indeterminate spinner. The spin is
 * `motion-safe:`-gated, resting as a static glyph under
 * `prefers-reduced-motion` (WCAG 2.3.3). Each size step is a `density-*`
 * class, so the spinner takes the step of its nearest density scope. The
 * spinner repeats the icon ramp and adds a step for `xl`, so a spinner and an
 * icon at one step have one size.
 */
const spinner = defineRecipe({
	base: ['inline-block shrink-0 motion-safe:animate-spin', 'density-size-[3,4,5,6,8]'],
	color,
	defaults: { color: 'current' },
})

export const k = defineRecipe(
	{
		// The gap between the dots takes the step of the nearest density scope.
		base: [flex.inline, 'shrink-0', 'density-gap-[0.5,1,1.5,2,2.5]'],
		color,
		defaults: { color: 'current' },
	},
	{ dot, spinner },
)

/** Recipe variant props for {@link LoadingDots} — its `color` axis and the `size` step, for consumers composing custom slots. */
export type LoadingDotsVariants = VariantProps<typeof k> & {
	/** The density step. Omit it to take the step of the nearest density scope. */
	size?: DensityStep
}
/** Recipe variant props for {@link LoadingSpinner} — its `color` axis and the `size` step, for consumers composing custom slots. */
export type LoadingSpinnerVariants = VariantProps<typeof spinner> & {
	/** The density step. Omit it to take the step of the nearest density scope. */
	size?: DensityStep
}
