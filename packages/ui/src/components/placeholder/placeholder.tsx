'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useJoin } from '../../primitives/join'
import { k } from '../../recipes/kata/placeholder'

export type PlaceholderProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * Pulsing skeleton shape. Defaults to a line; pass className for other shapes.
 *
 * When rendered inside a `<Group>` (directly or via context propagating through
 * any wrapper), the `data-group` attributes it stamps from `JoinContext` match
 * the group's container-scoped `tsunagi` join selectors; adjacent placeholders
 * appear as a single continuous shape, like the real controls.
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
