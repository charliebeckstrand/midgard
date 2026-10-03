import type { DensityStep } from '../../core/density'
import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { iro, narabi } from '../kiso'
import { dan } from '../kiso/dan'

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
		dan.size.dot,
		// In a Button (`data-variant`), the dots stop at the `lg` values, as the
		// button does. The parent of a dot is always its LoadingDots.
		dan.size.dotInButton,
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
	base: [
		'inline-block shrink-0 motion-safe:animate-spin',
		dan.size.spinner,
		// A child of a Button (`data-variant`) or of the inner button of a
		// SidebarItem stops at the `lg` values, as the button does. Each class
		// selects the spinner itself, so Chromium tests the rule only against the
		// spinners.
		dan.size.iconInButton,
		dan.size.iconInSidebarItem,
	],
	color,
	defaults: { color: 'current' },
})

export const k = defineRecipe(
	{
		// The gap between the dots takes the step of the nearest density scope.
		base: [
			flex.inline,
			'shrink-0',
			dan.gap.dots,
			// In a Button (`data-variant`), the gap stops at the `lg` value.
			dan.gap.dotsInButton,
		],
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
