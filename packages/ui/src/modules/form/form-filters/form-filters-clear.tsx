'use client'

import { isValidElement, type MouseEventHandler, type ReactNode } from 'react'
import { Button, type ButtonVariants } from '../../../components/button'
import { cn } from '../../../core'
import { cloneWithAction } from '../../../primitives/trigger-child/trigger-child'
import { useFormFilters } from './context'

/** Props for {@link FormFiltersClear}. */
export type FormFiltersClearProps = {
	children: ReactNode
	/**
	 * Button variant for the fallback trigger.
	 *
	 * Defaults to {@link Button}'s own, which is the neutral action a bar gets
	 * when it asks for nothing. Clearing a filter undoes a view, not a record, and
	 * a bar that shouts about it makes every other control read as lesser. An app
	 * that wants it to carry weight says so here.
	 *
	 * Ignored when `children` is a single element — that element carries its own
	 * treatment, and this component only lends it the clear action.
	 *
	 * @defaultValue `'solid'`, or the button variant of the surface around it, such as an Alert.
	 */
	variant?: ButtonVariants['variant']
	/**
	 * Button color for the fallback trigger. Defaults to {@link Button}'s own; ignored for an element child, as `variant` is.
	 *
	 * @defaultValue `'zinc'`, or the button color of the surface around it, such as an Alert.
	 */
	color?: ButtonVariants['color']
	className?: string
}

/**
 * The clear trigger of the enclosing {@link FormFilters}. A single valid
 * element child is cloned with a merged `onClick` (the child's own handler runs
 * first). Any other children fall back to a default `<Button>` trigger, whose
 * `variant` and `color` are overridable.
 *
 * @remarks Must render inside a `FormFilters`.
 */
export function FormFiltersClear({ children, variant, color, className }: FormFiltersClearProps) {
	const { clear: handleClear } = useFormFilters()

	// A single element child is cloned with the clear handler; anything else (a
	// bare string, several children) renders the default Button. `Children.only`
	// would throw on those instead of falling back as documented.
	if (isValidElement<{ onClick?: MouseEventHandler; className?: string }>(children)) {
		return cloneWithAction(
			children,
			handleClear,
			className ? { className: cn(children.props.className, className) } : undefined,
		)
	}

	return (
		<Button
			type="button"
			variant={variant}
			color={color}
			data-slot="form-filters-clear"
			onClick={handleClear}
			className={className}
		>
			{children}
		</Button>
	)
}
