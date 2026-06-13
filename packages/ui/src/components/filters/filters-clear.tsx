'use client'

import { Children, cloneElement, isValidElement, type MouseEvent, type ReactNode } from 'react'
import { cn } from '../../core'
import { Button } from '../button'
import { useFilters } from './context'

/** Props for {@link FiltersClear}. */
export type FiltersClearProps = {
	children: ReactNode
	className?: string
}

/**
 * Wires its child to the enclosing {@link Filters} clear action. A single valid
 * element child is cloned with a merged `onClick` (the child's own handler runs
 * first); any other children fall back to a default `<Button>` trigger.
 *
 * @remarks Must render inside a `Filters`.
 */
export function FiltersClear({ children, className }: FiltersClearProps) {
	const { clear: handleClear } = useFilters()

	const child = Children.only(children)

	if (isValidElement<Record<string, unknown>>(child)) {
		const childOnClick = child.props.onClick as ((e: MouseEvent<HTMLElement>) => void) | undefined

		return cloneElement(child, {
			onClick: (e: MouseEvent<HTMLElement>) => {
				childOnClick?.(e)

				handleClear()
			},
			className: className ? cn(child.props.className as string, className) : child.props.className,
		})
	}

	return (
		<Button data-slot="filter-clear" onClick={handleClear} className={className}>
			{children}
		</Button>
	)
}
