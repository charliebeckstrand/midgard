import { cn } from '../../core'
import { PolymorphicStatic, type PolymorphicStaticProps } from '../../primitives/polymorphic'
import { k } from '../../recipes/kata/box'
import {
	type BoxBg,
	type BoxOutline,
	type BoxRadius,
	type ResponsiveBoxPadding,
	resolvePadding,
	resolvePx,
	resolvePy,
} from './variants'

type BoxBaseProps = {
	/** Padding on all sides. Supports responsive breakpoints. */
	p?: ResponsiveBoxPadding
	/** Horizontal padding. Overrides p. Supports responsive breakpoints. */
	px?: ResponsiveBoxPadding
	/** Vertical padding. Overrides p. Supports responsive breakpoints. */
	py?: ResponsiveBoxPadding
	/** Border radius token. */
	radius?: BoxRadius
	/** Background surface token. */
	bg?: BoxBg
	/** Outline. `true` uses the default token; pass `'subtle'` / `'strong'` to pick a weight. */
	outline?: BoxOutline
	/**
	 * Overrides the `data-slot` attribute.
	 *
	 * @defaultValue 'box'
	 */
	'data-slot'?: string
	className?: string
}

/**
 * Props for {@link Box}: spacing, radius, background, and outline tokens plus
 * the static-tier `render` surface. `Omitted` drops keys for consumers that fix
 * a dimension (e.g. Card omits `radius`).
 *
 * @remarks
 * Box renders a `<div>` and takes no `as`. The static tier carries `render`
 * alone; `as` belongs to the client-tier {@link Polymorphic}.
 *
 * @typeParam Omitted - Prop keys to remove from the public surface.
 */
export type BoxProps<Omitted extends PropertyKey = never> = Omit<BoxBaseProps, Omitted> &
	PolymorphicStaticProps<'div', Omitted>

/**
 * Maps an `outline` prop to its kata class(es): `true` selects the default
 * weight, a named weight indexes the outline map, falsy emits nothing.
 *
 * @internal
 */
function resolveOutline(outline: BoxOutline | undefined): string | readonly string[] | undefined {
	if (!outline) return undefined

	if (outline === true) return k.outline.default

	return k.outline[outline]
}

/**
 * Static layout primitive for padding, radius, background, and outline tokens.
 * Renders in React Server Components. Every token is explicit; an omitted token
 * applies no style.
 */
export function Box({
	p,
	px,
	py,
	radius,
	bg,
	outline,
	'data-slot': slot = 'box',
	ref,
	className,
	href,
	render,
	children,
	...props
}: BoxProps) {
	return (
		<PolymorphicStatic
			as="div"
			ref={ref}
			data-slot={slot}
			href={href}
			render={render}
			className={cn(
				resolvePadding(p),
				resolvePx(px),
				resolvePy(py),
				radius && k.radius[radius],
				bg && k.bg[bg],
				resolveOutline(outline),
				className,
			)}
			{...props}
		>
			{children}
		</PolymorphicStatic>
	)
}
