import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k, type SwatchVariants } from '../../recipes/kata/swatch'

/** Props for {@link Swatch}: the `shape`/`variant`/`size` recipe axes, the `color` currentColor class, an optional accessible `label`, plus `<span>` attributes. */
export type SwatchProps = SwatchVariants & {
	/**
	 * The hue, as a `currentColor` class — a `text-*` utility, typically a
	 * data-viz palette token (e.g. `kata/chart`'s `series[c].text`) or an
	 * `iro.marker` shade. `solid` fills with it, `outline` frames with it,
	 * `soft` tints with it, `dashed` strokes a dashed line of it. Omitted, the
	 * swatch inherits the ambient text colour.
	 */
	color?: string
	className?: string
	/**
	 * Accessible name. Colour alone conveys meaning, so a *standalone* swatch
	 * needs a text alternative: when set, the swatch renders as `role="img"`
	 * with this label (WCAG 1.4.1 / 1.1.1). Omit it when the swatch is
	 * decorative and paired with adjacent visible text — a legend or tooltip
	 * row already names its own entry.
	 */
	label?: string
	/**
	 * Overrides the `data-slot` attribute.
	 *
	 * @defaultValue 'swatch'
	 */
	'data-slot'?: string
} & Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'color'>

/**
 * The colour key that stands in for a mark: a `square` box, a `circle` dot, or
 * a `line` bar — `solid`-filled, `soft`-tinted, `outline`-framed, or `dashed`
 * (a dashed `line`, for a dashed reference rule) by `color`, at any `size` from
 * `xs` to `xl`. A static leaf with no client hooks, so it renders in React
 * Server Components.
 *
 * @remarks
 * The fill rides on `currentColor` (the caller's `color` class), so the
 * CVD-validated data-viz palette stays in `kata/chart` and never forks, and
 * StatusDot composes this with its marker hues. Colour alone conveys meaning:
 * pass `label` for a standalone swatch to name it via `role="img"`, and omit it
 * when the swatch sits beside visible text.
 */
export function Swatch({
	shape,
	variant,
	size,
	color,
	label,
	className,
	'data-slot': slot = 'swatch',
	...props
}: SwatchProps) {
	// A bare <span> can't carry aria-label; name it only by promoting it to an
	// image. The role and label stay paired.
	const labelProps = label ? ({ role: 'img', 'aria-label': label } as const) : undefined

	return (
		<span
			data-slot={slot}
			data-shape={shape ?? 'square'}
			data-variant={variant ?? 'solid'}
			data-size={size ?? 'md'}
			className={cn(k({ shape, variant, size }), color, className)}
			{...labelProps}
			{...props}
		/>
	)
}
