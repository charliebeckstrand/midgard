import { cn } from '../../core'
import { Density } from '../../primitives/density'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/card'
import { Box, type BoxProps } from '../../structure/box'

/** Props for {@link Card}: Box surface props (radius and padding are fixed per `size`) plus the section/density `size` step. */
export type CardProps = BoxProps<'radius' | 'p' | 'px' | 'py'> & {
	/**
	 * Step for the card's own padding, its sections, and its radius, broadcast
	 * to children through the density cascade. Omit it to follow the nearest
	 * density scope, or `md` outside a scope.
	 */
	size?: Step
}

/**
 * Outlined, padded surface built on Box. Renders in React Server Components,
 * because the card never reads context. The matching section gap is projected
 * onto direct `data-slot=card-*` children from outside.
 *
 * An explicit `size` pins the step and opens a density scope. The card writes
 * `data-density` for static descendants. It also wraps its children in
 * `Density` for client descendants (Button, Input, …). Without `size`, the card
 * follows the nearest density scope, and takes `md` outside a scope. The scope
 * flows through to its children.
 *
 * The frame owns the outer padding for every child, bare or structural. A
 * section pads only the inner edge it shares with a sibling (header below,
 * footer above). Padding therefore has a single source on each edge. A header
 * keeps its projected gap whatever sibling follows it, a body included.
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
			data-size={size}
			data-density={size}
			bg={bg}
			outline={outline}
			className={cn('overflow-hidden -outline-offset-1', k.frame({ size }), className)}
			{...props}
		>
			{size ? <Density scale={size}>{children}</Density> : children}
		</Box>
	)
}
