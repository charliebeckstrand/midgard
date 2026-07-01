import { cn } from '../../core'
import { Density } from '../../primitives/density'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/card'
import { Box, type BoxProps } from '../box'

/** Props for {@link Card}: Box surface props (radius is fixed per `size`) plus the section/density `size` step. */
export type CardProps = BoxProps<'radius'> & {
	/**
	 * Step for the card's own padding, its sections, and its radius, broadcast
	 * to children through the density cascade.
	 * @defaultValue 'md'
	 */
	size?: Step
}

/**
 * Outlined, padded surface built on Box. Renders in React Server Components:
 * the card never reads context — `size` is explicit (default `md`) and the
 * matching section gap is projected onto direct `data-slot=card-*` children
 * from outside. An explicit `size` additionally opens a density scope so
 * size-aware client children (Button, Input, …) inherit the step; an unsized
 * card stays fully static and lets ambient density flow through.
 *
 * The frame owns the outer padding for every child, bare or structural; a
 * section pads only the inner edge it shares with a sibling (header below,
 * footer above), so padding has a single source on each edge. A header
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
			className={cn(
				'overflow-hidden -outline-offset-1',
				/**
				 * Zeroes the header's gap whenever a CardBody is its next sibling — a header
				 * with no next sibling, or a non-body one (e.g. a footer with no body between
				 * them), keeps the `slots` gap above. The extra `[data-slot=card-header]`
				 * attribute check makes this compound projection strictly more specific than
				 * the plain `slots` row it overrides, so it always wins outright, at every
				 * step, regardless of class order.
				 */
				'*:data-[slot=card-header]:has-[+[data-slot=card-body]]:pb-0',
				k.slots[step],
				className,
			)}
			{...props}
		>
			{size ? <Density scale={size}>{children}</Density> : children}
		</Box>
	)
}
