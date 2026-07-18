'use client'

import { cloneElement, isValidElement, type MouseEvent, type ReactNode } from 'react'
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

	// A single element child is cloned with the clear handler; anything else (a
	// bare string, several children) renders the default Button. `Children.only`
	// would throw on those instead of falling back as documented.
	if (isValidElement<Record<string, unknown>>(children)) {
		const childOnClick = children.props.onClick as
			| ((event: MouseEvent<HTMLElement>) => void)
			| undefined

		return cloneElement(children, {
			onClick: (event: MouseEvent<HTMLElement>) => {
				childOnClick?.(event)

				handleClear()
			},
			className: className
				? cn(children.props.className as string, className)
				: children.props.className,
		})
	}

	return (
		<Button type="button" data-slot="filter-clear" onClick={handleClear} className={className}>
			{children}
		</Button>
	)
}
