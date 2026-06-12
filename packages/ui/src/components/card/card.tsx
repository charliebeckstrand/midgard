import { cn } from '../../core'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/card'
import { Box, type BoxProps } from '../box'

export type CardProps = BoxProps<'radius'> & {
	/**
	 * Step for the card's own padding, its sections, and its radius.
	 * Defaults to `md`.
	 */
	size?: Step
}

/**
 * Outlined, padded surface built on Box. Static leaf: renders in React
 * Server Components. `size` is explicit (default `md`); the card projects
 * the matching padding onto direct `data-slot=card-*` sections, so sections
 * track the card without reading context. A nested section collapses the
 * Card's own padding to zero.
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
			{children}
		</Box>
	)
}
