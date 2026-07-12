import type { ComponentPropsWithoutRef, CSSProperties } from 'react'
import { cn } from '../../core'
import { type ChartColorSlot, k as chart } from '../../recipes/kata/chart'
import { k, type SwatchVariants } from '../../recipes/kata/swatch'

/**
 * Resolves a {@link SwatchProps.color} to its `currentColor` carrier: a
 * `kata/chart` palette slot name to its CVD-validated `text-*` class, a raw hex
 * or `oklch()` colour to an inline `color` style, and anything else — a
 * caller-supplied `text-*` utility — through unchanged as a class. Mirrors the
 * chart's own `ChartColor` model (`chart-color/paint.ts`): a named slot paints
 * through a class, a raw colour paints inline.
 *
 * @internal
 */
function resolveSwatchColor(color: string | undefined): {
	colorClass: string | undefined
	colorStyle: CSSProperties | undefined
} {
	if (!color) return { colorClass: undefined, colorStyle: undefined }

	// `Object.hasOwn` so a name off `Object.prototype` ('toString') can't pose as
	// a slot. A slot inks through its class; the raw path never runs for it.
	if (Object.hasOwn(chart.series, color)) {
		return { colorClass: cn(chart.series[color as ChartColorSlot].text), colorStyle: undefined }
	}

	// A hex or `oklch()` is a raw CSS colour with no class form, so it inks inline
	// on `currentColor`; any other string is a caller-supplied `text-*` utility.
	if (color.startsWith('#') || /^oklch\(/i.test(color)) {
		return { colorClass: undefined, colorStyle: { color } }
	}

	return { colorClass: color, colorStyle: undefined }
}

/** Props for {@link Swatch}: the `shape`/`variant`/`size` recipe axes, the `color` hue, an optional accessible `label`, plus `<span>` attributes. */
export type SwatchProps = SwatchVariants & {
	/**
	 * The hue on `currentColor`, one of: a `kata/chart` palette slot name
	 * (`'blue'`, `'red'`, … — inked through its CVD-validated `text-*` class); a
	 * raw hex (`'#2563eb'`) or `oklch()` string (inked inline); or a `text-*`
	 * utility class, typically a data-viz palette token (e.g. `kata/chart`'s
	 * `series[c].text`) or an `iro.marker` shade. `solid` fills with it, `outline`
	 * frames with it, `soft` tints with it, `dashed` strokes it. Omitted, the
	 * swatch inherits the ambient text colour.
	 */
	color?: ChartColorSlot | (string & {})
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
 * (a dashed run on a `line`, a dashed border on a `square` or `circle`, for a
 * dashed reference rule) by `color`, at any `size` from `xs` to `xl`. A static
 * leaf with no client hooks, so it renders in React Server Components.
 *
 * @remarks
 * The fill rides on `currentColor`, which `color` sets three ways: a
 * `kata/chart` palette slot name (inked through its CVD-validated class), a raw
 * hex / `oklch()` colour (inked inline), or a `text-*` utility (passed through).
 * The CVD-validated data-viz palette stays in `kata/chart` and never forks, and
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
	style,
	'data-slot': slot = 'swatch',
	...props
}: SwatchProps) {
	// A bare <span> can't carry aria-label; name it only by promoting it to an
	// image. The role and label stay paired.
	const labelProps = label ? ({ role: 'img', 'aria-label': label } as const) : undefined

	const { colorClass, colorStyle } = resolveSwatchColor(color)

	return (
		<span
			data-slot={slot}
			data-shape={shape ?? 'square'}
			data-variant={variant ?? 'solid'}
			data-size={size ?? 'md'}
			className={cn(k({ shape, variant, size }), colorClass, className)}
			// A raw `color` inks inline; an explicit `style` prop still wins on conflict.
			style={colorStyle ? { ...colorStyle, ...style } : style}
			{...labelProps}
			{...props}
		/>
	)
}
