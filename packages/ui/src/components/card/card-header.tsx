import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/card'

/** Props for {@link CardHeader}: native `<div>` attributes. */
export type CardHeaderProps = ComponentProps<'div'>

/**
 * Header region of a {@link Card}, typically holding a {@link CardTitle} and
 * {@link CardDescription}. Pads its bottom edge by the step of the nearest
 * density scope when a sibling follows it, so a {@link CardBody} sits one step
 * below. A header with no sibling after it adds no pad, and the card pads that
 * edge.
 *
 * @remarks
 * Static leaf: renders in React Server Components.
 */
export function CardHeader({ className, ...props }: CardHeaderProps) {
	return (
		<div
			className={cn(k().header, className)}
			{...props}
			// The pad of the footer reads the anchor, so it comes after the spread.
			data-slot="card-header"
		/>
	)
}
