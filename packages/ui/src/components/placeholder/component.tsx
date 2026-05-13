import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useJoin } from '../../primitives'
import { k } from '../../recipes/kata/placeholder'

export type PlaceholderProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * Pulsing skeleton shape. Defaults to a line; pass className for other shapes.
 *
 * When rendered inside a `<Group>` (directly or via context propagating through
 * any wrapper), `tsunagi.base` join classes activate via `data-group` attributes
 * read from `JoinContext`, so adjacent placeholders appear as a single
 * continuous shape just like the real controls would.
 */
export function Placeholder({ className, ...props }: PlaceholderProps) {
	const join = useJoin()

	return (
		<div
			data-slot="placeholder"
			aria-hidden="true"
			data-group={join?.position}
			data-group-orientation={join?.orientation}
			className={cn(k.base, className)}
			{...props}
		/>
	)
}
