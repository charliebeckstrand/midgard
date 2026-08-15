'use client'

import { cloneElement, isValidElement, type MouseEvent, type ReactNode } from 'react'
import { cn } from '../../core'
import { Button, type ButtonVariants } from '../button'
import { useFilters } from './context'

/** Props for {@link FiltersClear}. */
export type FiltersClearProps = {
	children: ReactNode
	/**
	 * Button variant for the fallback trigger.
	 *
	 * Defaults to {@link Button}'s own, which is the neutral action a bar gets
	 * when it asks for nothing: clearing a filter undoes a view, not a record, and
	 * a bar that shouts about it makes every other control read as lesser. An app
	 * that wants it to carry weight says so here.
	 *
	 * Ignored when `children` is a single element — that element carries its own
	 * treatment, and this component only lends it the clear action.
	 */
	variant?: ButtonVariants['variant']
	/** Button colour for the fallback trigger. Defaults to {@link Button}'s own; ignored for an element child, as `variant` is. */
	color?: ButtonVariants['color']
	className?: string
}

/**
 * Wires its child to the enclosing {@link Filters} clear action. A single valid
 * element child is cloned with a merged `onClick` (the child's own handler runs
 * first); any other children fall back to a default `<Button>` trigger, whose
 * `variant` and `color` are overridable.
 *
 * @remarks Must render inside a `Filters`.
 */
export function FiltersClear({ children, variant, color, className }: FiltersClearProps) {
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
		<Button
			type="button"
			variant={variant}
			color={color}
			data-slot="filter-clear"
			onClick={handleClear}
			className={className}
		>
			{children}
		</Button>
	)
}
