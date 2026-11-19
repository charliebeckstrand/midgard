/**
 * Swatch kata: the color key that stands in for a mark. Four independent
 * axes:
 *
 * - `shape`: the mark geometry (`square` box, `circle` dot, `line` bar)
 * - `variant`: the fill treatment (`solid` / `outline` / `soft` / `dashed`)
 * - `orientation`: the direction of a `line` (`horizontal` / `vertical`)
 * - `size`: `xs`–`xl`, one scale shared by legends, tooltips, and StatusDot. The
 *   component writes it as a density scope. Without it, the swatch takes the
 *   step of its nearest density scope.
 *
 * The hue is a caller-supplied `currentColor` value applied on top: a `text-*`
 * utility, a data-viz slot name, or a raw hex / `oklch()`. `Swatch` resolves
 * it. A slot name inks through {@link series}, the `zu` palette that the chart
 * and map kata read too. The CVD-validated data-viz palette therefore never
 * forks, and any hue works. `solid` fills with it, `outline` frames with
 * it, and `soft` tints with it at 15% inside a 1px edge in the hue. `dashed`
 * renders it per shape: a dashed run along a `line`, a dashed border
 * around a `square` or `circle`. Either mirrors a dashed reference rule in a
 * legend.
 */
import { defineScale, type ScaleStep } from '../../core/density'
import { defineKata, type VariantProps } from '../../core/recipe'
import { dan, omote, sen, zu } from '../kiso'

export type { SeriesSlot } from '../kiso'

const { bg } = omote

export const k = defineKata({
	base: ['inline-block', 'shrink-0'],
	// Shape sets only the corner radius; the dimensions come from the shape
	// compounds below, so no two size utilities collide.
	shape: {
		square: 'rounded-xs',
		circle: 'rounded-full',
		line: 'rounded-full',
	},
	// Fill treatment over `currentColor` (the caller's resolved `color`): filled,
	// tinted at 15% (the house soft weight), framed on the surface, or dashed,
	// which is shape-specific and so lives in the compounds below to mirror a
	// dashed reference rule on a line and a dashed stroke around a box or dot.
	variant: {
		// Forced colors replace the fill with Canvas, so the mark paints in
		// CanvasText instead. Without it, a solid swatch disappears.
		solid: ['bg-current', sen.forced.shape],
		// The 15% tint alone is about 1.2:1 against the page, so a 1px edge in the
		// hue keeps the mark visible (WCAG 1.4.11).
		soft: 'border border-current bg-current/15',
		outline: ['border-2 border-current', ...bg.surface],
		// Shape-specific; the shape × dashed compounds carry the class.
		dashed: '',
	},
	// The direction of a `line`. A box and a dot ignore it. The size of each
	// direction lives in the compounds below.
	orientation: {
		horizontal: '',
		vertical: '',
	},
	// A box and a dot share one 6px→14px ramp; a line holds a 2px thickness and
	// grows in length. `md` matches the legend swatches, `sm` the tooltip
	// swatches, and the full range covers StatusDot's dots.
	compound: [
		{ shape: 'square', class: dan.size.swatch.base },
		{ shape: 'circle', class: dan.size.swatch.base },
		{ shape: 'line', orientation: 'horizontal', class: ['h-0.5', dan.size.swatch.line] },
		// A vertical line has the length of a horizontal line. Its inline margin
		// gives it the width of a horizontal line too, so the labels in a column of
		// mixed swatches start at one edge.
		{
			shape: 'line',
			orientation: 'vertical',
			class: ['w-0.5', dan.size.swatch.column, dan.size.swatch.columnInset],
		},
		// A 2px line has no room inside a 2px frame, so the frame filled it and the
		// mark read as a solid bar. An outline line is 4px thick with a 1px edge,
		// which leaves a 2px core in the surface color. A vertical line keeps its
		// 2px box and draws the edge as an outline, which takes no width, so the
		// line keeps the width of a horizontal line.
		{ shape: 'line', variant: 'outline', orientation: 'horizontal', class: ['h-1', 'border'] },
		{
			shape: 'line',
			variant: 'outline',
			orientation: 'vertical',
			class: ['border-0', 'outline', 'outline-current'],
		},
		// Dashed treatment per shape. A line paints a `currentColor` dash run along
		// its length (the reference rule's 3:2 dash:gap halved so the pattern reads
		// across a swatch-length line). A box or dot has no length to run, so it
		// frames with a dashed border over the surface, mirroring `outline`. Forced
		// colors drop a gradient, so a run opts out of them and inks in CanvasText.
		// Without it, a dashed line disappears.
		{
			shape: 'line',
			variant: 'dashed',
			orientation: 'horizontal',
			class: [
				'bg-[repeating-linear-gradient(to_right,currentColor_0,currentColor_3px,transparent_3px,transparent_5px)]',
				sen.forced.text,
			],
		},
		{
			shape: 'line',
			variant: 'dashed',
			orientation: 'vertical',
			class: [
				'bg-[repeating-linear-gradient(to_bottom,currentColor_0,currentColor_3px,transparent_3px,transparent_5px)]',
				sen.forced.text,
			],
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
	defaults: { shape: 'square', variant: 'solid', orientation: 'horizontal' },
})

/**
 * The data-viz series palette from `zu`: the CVD-validated `text-*` class of
 * each slot name that {@link Swatch} takes as its `color`.
 */
export const series = zu.palette.series

/** The size scale of {@link Swatch}: the steps of its box, dot, and line. */
export const scale = defineScale(dan.size.swatch.base, dan.size.swatch.line)

/** Recipe variant props for {@link Swatch}: the `shape` and `variant` axes of its kata, and the `size` step that the component writes as a density scope. */
export type SwatchVariants = Omit<VariantProps<typeof k>, 'shape' | 'variant' | 'orientation'> & {
	/** The shape of the mark: a box, a dot, or a line. @defaultValue 'square' */
	shape?: VariantProps<typeof k>['shape']
	/** The fill style of the mark. @defaultValue 'solid' */
	variant?: VariantProps<typeof k>['variant']
	/**
	 * The direction of a `line`. A `vertical` line keys a vertical mark, such as
	 * a rule at a category. It takes the width of a `horizontal` line, so a label
	 * after it lines up with a label after a horizontal line. A box and a dot
	 * ignore it.
	 * @defaultValue 'horizontal'
	 */
	orientation?: VariantProps<typeof k>['orientation']
	/**
	 * The density step of the mark. Omit it to take the step of the nearest
	 * density scope. A step makes the mark a density scope.
	 */
	size?: ScaleStep<typeof scale>
}
