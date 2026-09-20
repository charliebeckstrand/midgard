import { cn } from '../../core'
import { Density } from '../../primitives/density'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/card'
import { Box, type BoxProps } from '../box'

/** Props for {@link Card}: Box surface props (radius and padding are fixed per `size`) plus the section/density `size` step. */
export type CardProps = BoxProps<'radius' | 'p' | 'px' | 'py'> & {
	/**
	 * Step for the card's own padding, its sections, and its radius, broadcast
	 * to children through the density cascade.
	 * @defaultValue 'md'
	 */
	size?: Step
}

/**
 * Outlined, padded surface built on Box. Renders in React Server Components,
 * because the card never reads context. `size` is explicit (default `md`), and
 * the matching section gap is projected onto direct `data-slot=card-*` children
 * from outside. An explicit `size` additionally opens a density scope, so
 * size-aware client children (Button, Input, …) inherit the step. An unsized
 * card stays fully static and lets ambient density flow through.
 *
 * The frame owns the outer padding for every child, bare or structural. A
 * section pads only the inner edge it shares with a sibling (header below,
 * footer above). Padding therefore has a single source on each edge. A header
 * directly followed by a body collapses that gap to zero — the two sit flush.
 */
export function Card({
	size,
	bg = 'none',
	outline = true,
	className,
	children,
	...props
}: CardProps) {
	const step = size ?? 'md'

	return (
		<Box
			data-slot="card"
			data-size={step}
			p={step}
			bg={bg}
			outline={outline}
			radius={k.radius[step]}
			className={cn('overflow-hidden -outline-offset-1', k.slots[step], className)}
			{...props}
		>
			{size ? <Density scale={size}>{children}</Density> : children}
		</Box>
	)
}
