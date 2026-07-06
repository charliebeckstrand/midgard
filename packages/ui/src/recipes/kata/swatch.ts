/**
 * Swatch kata: the colour key that stands in for a mark. Three independent
 * axes — `shape` (the mark geometry: `square` box, `circle` dot, `line` bar),
 * `variant` (the fill treatment: `solid` / `outline` / `soft`), and `size`
 * (`xs`–`xl`, one scale shared by legends, tooltips, and StatusDot). The hue is
 * a caller-supplied `currentColor` class (a `text-*` utility) applied on top,
 * so the CVD-validated data-viz palette stays in `kata/chart` and never forks,
 * and any hue works: `solid` fills with it, `outline` frames with it, `soft`
 * tints with it at 15%, and — for the `line` shape — `dashed` strokes a dashed
 * line of it, mirroring a dashed reference rule in a legend.
 */
import { defineRecipe, type VariantProps } from '../../core/recipe'
import { omote } from '../kiso'

const { bg } = omote

export const k = defineRecipe({
	base: ['inline-block', 'shrink-0'],
	// Shape sets only the corner radius; dimensions come from the size
	// compounds below, keyed on shape × size so no two size utilities collide.
	shape: {
		square: 'rounded-xs',
		circle: 'rounded-full',
		line: 'rounded-full',
	},
	// Fill treatment over `currentColor` (the caller's `color` text-* class):
	// filled, tinted at 15% (the house soft weight), framed on the surface, or —
	// for the `line` shape — dashed to mirror a dashed reference rule.
	variant: {
		solid: 'bg-current',
		soft: 'bg-current/15',
		outline: ['border-2 border-current', ...bg.surface],
		// A horizontal dash run in `currentColor` — the reference rule's 3:2
		// dash:gap halved so the pattern reads across a swatch-width line. Meant
		// for `line`; on a box it stripes.
		dashed:
			'bg-[repeating-linear-gradient(to_right,currentColor_0,currentColor_3px,transparent_3px,transparent_5px)]',
	},
	// Selection-only; box/bar dimensions live in the compounds.
	size: { xs: '', sm: '', md: '', lg: '', xl: '' },
	// A box and a dot share one 6px→16px scale; a line holds a 2px height and
	// grows in width. `md` matches the legend swatches, `sm` the tooltip
	// swatches, and the full range covers StatusDot's dots.
	compound: [
		{ shape: 'square', size: 'xs', class: 'size-1.5' },
		{ shape: 'square', size: 'sm', class: 'size-2' },
		{ shape: 'square', size: 'md', class: 'size-2.5' },
		{ shape: 'square', size: 'lg', class: 'size-3' },
		{ shape: 'square', size: 'xl', class: 'size-4' },
		{ shape: 'circle', size: 'xs', class: 'size-1.5' },
		{ shape: 'circle', size: 'sm', class: 'size-2' },
		{ shape: 'circle', size: 'md', class: 'size-2.5' },
		{ shape: 'circle', size: 'lg', class: 'size-3' },
		{ shape: 'circle', size: 'xl', class: 'size-4' },
		{ shape: 'line', size: 'xs', class: 'h-0.5 w-2' },
		{ shape: 'line', size: 'sm', class: 'h-0.5 w-2.5' },
		{ shape: 'line', size: 'md', class: 'h-0.5 w-3' },
		{ shape: 'line', size: 'lg', class: 'h-0.5 w-3.5' },
		{ shape: 'line', size: 'xl', class: 'h-0.5 w-4' },
	],
	defaults: { shape: 'square', variant: 'solid', size: 'md' },
})

/** Recipe variant props for {@link Swatch} — the `shape`, `variant`, and `size` axes, for consumers composing custom slots. */
export type SwatchVariants = VariantProps<typeof k>
