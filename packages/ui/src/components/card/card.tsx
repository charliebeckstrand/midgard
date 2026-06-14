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
 * matching section padding is projected onto direct `data-slot=card-*`
 * children from outside. An explicit `size` additionally opens a density
 * scope so size-aware client children (Button, Input, …) inherit the step;
 * an unsized card stays fully static and lets ambient density flow through.
 * A nested section collapses the Card's own padding to zero.
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
				// Collapse the Card's own padding only for structural slots that bring
				// their own; a bare CardTitle/CardDescription child supplies none and
				// keeps the frame padding.
				'[&:has(>[data-slot=card-header])]:p-0',
				'[&:has(>[data-slot=card-body])]:p-0',
				'[&:has(>[data-slot=card-footer])]:p-0',
				k.sections[step],
				className,
			)}
			{...props}
		>
			{size ? <Density scale={size}>{children}</Density> : children}
		</Box>
	)
}
