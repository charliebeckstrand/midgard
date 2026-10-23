import { defineScale, type ScaleStep } from '../../core/density'
import { defineKata, type VariantProps } from '../../core/recipe'
import { dan, iro, narabi } from '../kiso'

const { marker } = iro
const { flex } = narabi

/**
 * Indicator color, shared by both loading surfaces. Resolves to a `text-*`
 * class; dots (`bg-current`) and the spinner SVG (`currentColor`) both inherit
 * it. Each color uses the `iro.marker` shade, which clears non-text 3:1 on the
 * page. `current` inherits the surrounding text color.
 */
const color = { current: 'text-current', ...marker }

/**
 * A single ellipsis dot. The pulse animation is `motion-safe:`-gated, resting
 * as a steady dot under `prefers-reduced-motion` (WCAG 2.3.3). The diameter is
 * a stepped `density-*` class, so the dot takes the step of its nearest
 * density scope, as the spinner does.
 */
const dot = {
	base: ['shrink-0 rounded-full bg-current', 'motion-safe:animate-pulse', dan.size.dot],
}

/**
 * Rotating SVG indicator: indeterminate spinner. The spin is
 * `motion-safe:`-gated, resting as a static glyph under
 * `prefers-reduced-motion` (WCAG 2.3.3). Each size step is a `density-*`
 * class, so the spinner takes the step of its nearest density scope. The
 * spinner takes the icon ramp, so a spinner and an icon at one step have one
 * size.
 */
const spinner = {
	base: ['inline-block shrink-0 motion-safe:animate-spin', dan.size.icon.base],
	color,
}

export const k = defineKata({
	// The gap between the dots takes the step of the nearest density scope.
	base: [flex.inline, 'shrink-0', dan.gap.dots],
	color,
	slots: { dot, spinner },
	defaults: { color: 'current' },
})

/**
 * The size scales. `dots` is the scale of {@link LoadingDots}: the steps of the
 * dot and the gap. `spinner` is the scale of {@link LoadingSpinner}: the steps
 * of the icon ramp.
 */
export const scale = {
	dots: defineScale(dan.size.dot, dan.gap.dots),
	spinner: defineScale(dan.size.icon.base),
} as const

/** Recipe variant props for {@link LoadingDots}: its `color` axis and the `size` step, for consumers composing custom slots. */
export type LoadingDotsVariants = Omit<VariantProps<typeof k>, 'color'> & {
	/** The color of the dots. `current` takes the color of the text around them. @defaultValue 'current' */
	color?: VariantProps<typeof k>['color']
	/** The density step. Omit it to take the step of the nearest density scope. */
	size?: ScaleStep<typeof scale.dots>
}
/** Recipe variant props for {@link LoadingSpinner}: its `color` axis and the `size` step, for consumers composing custom slots. */
export type LoadingSpinnerVariants = {
	/** The color of the spinner. `current` takes the color of the text around it. @defaultValue 'current' */
	color?: VariantProps<typeof k>['color']
	/** The density step. Omit it to take the step of the nearest density scope. */
	size?: ScaleStep<typeof scale.spinner>
}
