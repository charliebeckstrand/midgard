import { cn } from '../../core'
import type { DensityStep } from '../../core/density'
import { PolymorphicStatic, type PolymorphicStaticProps } from '../../primitives/polymorphic'
import { k } from '../../recipes/kata/box'
import type { BoxBg, BoxOutline, BoxRadius, ResponsiveBoxPadding } from './variants'

type BoxBaseProps = {
	/**
	 * Padding on all sides. Supports responsive breakpoints. The padding takes the
	 * step of the nearest density scope, as the `gap` of Flex does.
	 */
	p?: ResponsiveBoxPadding
	/** Horizontal padding. Overrides p. Supports responsive breakpoints. */
	px?: ResponsiveBoxPadding
	/** Vertical padding. Overrides p. Supports responsive breakpoints. */
	py?: ResponsiveBoxPadding
	/** Border radius token. @defaultValue 'none' */
	radius?: BoxRadius
	/** Background surface token. @defaultValue 'none' */
	bg?: BoxBg
	/**
	 * Outline. `true` uses the default weight. Pass `'subtle'` or `'strong'` to
	 * pick a different weight.
	 *
	 * @defaultValue false
	 */
	outline?: BoxOutline
	/**
	 * The density step. Omit it to take the step of the nearest density scope.
	 * A step makes the box a density scope: it writes `data-density` for static
	 * descendants and opens the density context for client descendants.
	 */
	density?: DensityStep
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
 * Static layout primitive for padding, radius, background, and outline tokens.
 * Renders in React Server Components. Every token is explicit; an omitted token
 * applies no style. A `density` step makes the box a density scope.
 */
export function Box({
	p,
	px,
	py,
	radius,
	bg,
	outline,
	density,
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
			density={density}
			href={href}
			render={render}
			className={cn(k({ p, px, py, radius, bg, outline }).base, className)}
			{...props}
		>
			{children}
		</PolymorphicStatic>
	)
}
