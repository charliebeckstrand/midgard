import { cn } from '../../core'
import type { ScaleStep } from '../../core/density'
import { k, type scale } from '../../recipes/kata/card'
import { Box, type BoxProps } from '../../structure/box'

/** Props for {@link Card}: Box surface props (radius and padding follow the step) plus the `size` step. */
export type CardProps = BoxProps<
	'radius' | 'p' | 'px' | 'py' | 'density' | 'bg' | 'outline' | 'data-slot'
> & {
	/**
	 * Background surface token.
	 * @defaultValue 'none'
	 */
	bg?: BoxProps['bg']
	/**
	 * Outline. `true` uses the default weight. Pass `'subtle'` or `'strong'` to
	 * pick a different weight.
	 * @defaultValue true
	 */
	outline?: BoxProps['outline']
	/**
	 * The density step of the card's own padding, its sections, and its radius.
	 * Omit it to take the step of the nearest density scope. A step makes the
	 * card a density scope, so its children take the step too.
	 */
	size?: ScaleStep<typeof scale>
	/**
	 * Overrides the `data-slot` attribute.
	 *
	 * @defaultValue 'card'
	 */
	'data-slot'?: string
}

/**
 * Outlined, padded surface built on Box. Renders in React Server Components,
 * because the card never reads context. The frame, the header, and the footer
 * write each step in a stepped `density-*` utility, so they take the step of the
 * nearest density scope. An explicit `size` makes the card a density scope
 * through Box `density`. Its sections, its static leaves, and its size-aware
 * client children (Button, Input, …) then take that step.
 *
 * The frame owns the outer padding for every child, bare or structural. A
 * section pads only an inner edge that it shares with a sibling (header below,
 * footer above). With no body, the header owns the edge that it shares with
 * the footer. Padding therefore has a single source on each edge.
 *
 * The card clips its overflow, but it is not a scroll container. Thus in a flex
 * row or a grid track, the card is at least as wide as its widest word, as is
 * any other box. To let a card become narrower than a long token, such as a
 * hash or a URL, give it `min-w-0`. The body then breaks the token.
 */
export function Card({
	size,
	bg = 'none',
	outline = true,
	className,
	children,
	...props
}: CardProps) {
	return (
		<Box
			data-slot="card"
			density={size}
			bg={bg}
			outline={outline}
			className={cn('overflow-clip -outline-offset-1', k.base, className)}
			{...props}
		>
			{children}
		</Box>
	)
}
