/**
 * Swatch kata: the color key that stands in for a mark. Three independent
 * axes:
 *
 * - `shape`: the mark geometry — `square` box, `circle` dot, `line` bar
 * - `variant`: the fill treatment — `solid` / `outline` / `soft` / `dashed`
 * - `size`: `xs`–`xl`, one scale shared by legends, tooltips, and StatusDot. The
 *   component writes it as a density scope. Without it, the swatch takes the
 *   step of its nearest density scope.
 *
 * The hue is a caller-supplied `currentColor` value applied on top: a `text-*`
 * utility, a `kata/chart` slot name, or a raw hex / `oklch()`. `Swatch` resolves
 * it. The CVD-validated data-viz palette therefore stays in `kata/chart` and
 * never forks, and any hue works. `solid` fills with it, `outline` frames with
 * it, and `soft` tints with it at 15% inside a 1px edge in the hue. `dashed`
 * renders it per shape: a dashed dash run across a `line`, a dashed border
 * around a `square` or `circle`. Either mirrors a dashed reference rule in a
 * legend.
 */
import { defineScale, type ScaleStep } from '../../core/density'
import { defineRecipe, type VariantProps } from '../../core/recipe'
import { omote } from '../kiso'
import { dan } from '../kiso/dan'

const { bg } = omote

export const k = defineRecipe({
	base: ['inline-block', 'shrink-0'],
	// Shape sets only the corner radius; the dimensions come from the shape
	// compounds below, so no two size utilities collide.
	shape: {
		square: 'rounded-xs',
		circle: 'rounded-full',
		line: 'rounded-full',
	},
	// Fill treatment over `currentColor` (the caller's resolved `color`): filled,
	// tinted at 15% (the house soft weight), framed on the surface, or dashed —
	// which is shape-specific and so lives in the compounds below to mirror a
	// dashed reference rule on a line and a dashed stroke around a box or dot.
	variant: {
		solid: 'bg-current',
		// The 15% tint alone is about 1.2:1 against the page, so a 1px edge in the
		// hue keeps the mark visible (WCAG 1.4.11).
		soft: 'border border-current bg-current/15',
		outline: ['border-2 border-current', ...bg.surface],
		// Shape-specific; the shape × dashed compounds carry the class.
		dashed: '',
	},
	// A box and a dot share one 6px→16px ramp; a line holds a 2px height and
	// grows in width. `md` matches the legend swatches, `sm` the tooltip
	// swatches, and the full range covers StatusDot's dots.
	compound: [
		{ shape: 'square', class: dan.size.swatch.base },
		{ shape: 'circle', class: dan.size.swatch.base },
		{ shape: 'line', class: ['h-0.5', dan.size.swatch.line] },
		// Dashed treatment per shape. A line paints a horizontal `currentColor`
		// dash run — the reference rule's 3:2 dash:gap halved so the pattern reads
		// across a swatch-width line. A box or dot has no length to run, so it
		// frames with a dashed border over the surface, mirroring `outline`.
		{
			shape: 'line',
			variant: 'dashed',
			class:
				'bg-[repeating-linear-gradient(to_right,currentColor_0,currentColor_3px,transparent_3px,transparent_5px)]',
		},
		{
			shape: 'square',
			variant: 'dashed',
			class: ['border-2 border-dashed border-current', ...bg.surface],
		},
		{
			shape: 'circle',
			variant: 'dashed',
			class: ['border-2 border-dashed border-current', ...bg.surface],
		},
	],
	defaults: { shape: 'square', variant: 'solid' },
})

/** The size scale of {@link Swatch}: the steps of its box, dot, and line. */
export const scale = defineScale(dan.size.swatch.base, dan.size.swatch.line)

/** Recipe variant props for {@link Swatch}: the `shape` and `variant` axes of its kata, and the `size` step that the component writes as a density scope. */
export type SwatchVariants = Omit<VariantProps<typeof k>, 'shape' | 'variant'> & {
	/** The shape of the mark: a box, a dot, or a line. @defaultValue 'square' */
	shape?: VariantProps<typeof k>['shape']
	/** The fill style of the mark. @defaultValue 'solid' */
	variant?: VariantProps<typeof k>['variant']
	size?: ScaleStep<typeof scale>
}
