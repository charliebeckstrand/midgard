import { cn } from '../../core'
import { DensityScope } from '../../primitives/density'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/card'
import { Box, type BoxProps } from '../../structure/box'

/** Props for {@link Card}: Box surface props (radius and padding follow the step) plus the `size` step. */
export type CardProps = BoxProps<'radius' | 'p' | 'px' | 'py'> & {
	/**
	 * Step for the card's own padding, its sections, and its radius. Omit it to
	 * follow the nearest density scope, and `md` outside one. An explicit step
	 * also goes to children through the density cascade.
	 */
	size?: Step
}

/**
 * Outlined, padded surface built on Box. Renders in React Server Components,
 * because the card never reads context. The frame, the header, and the footer
 * write each step under a `density-*` variant, so they take the step of the
 * nearest density scope. An explicit `size` writes `data-density` on the card,
 * so the card is the scope of its own sections and of static leaves inside it.
 * It also opens a density context scope, so size-aware client children
 * (Button, Input, …) take the same step.
 *
 * The frame owns the outer padding for every child, bare or structural. A
 * section pads only the inner edge it shares with a sibling (header below,
 * footer above). Padding therefore has a single source on each edge.
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
			data-density={size}
			bg={bg}
			outline={outline}
			className={cn('overflow-hidden -outline-offset-1', k.frame, className)}
			{...props}
		>
			<DensityScope scale={size}>{children}</DensityScope>
		</Box>
	)
}
