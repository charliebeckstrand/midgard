'use client'

import { isValidElement, type MouseEvent, type MouseEventHandler, type ReactNode } from 'react'
import { Button, type ButtonVariants } from '../../../components/button'
import { cn } from '../../../core'
import { cloneWithAction } from '../../../primitives/trigger-child/trigger-child'
import { k } from '../../../recipes/kata/form-filters'
import { getTabbableElements } from '../../../utilities/focusable-selector'
import { useFormFilters, useFormFiltersAxis } from './context'

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
	 * Ignored when `children` is a single element: that element carries its own
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
 * @remarks
 * The trigger shows only while there is something to clear: a field holds a
 * value that the bar's default does not. A Clear over an unfiltered bar offers
 * to undo nothing. Under a `stack` in a row, it keeps its box while it hides,
 * so the fields do not change width when it appears. Under a `rail`, and under
 * a `stack` on a compact viewport, it takes no space until it appears.
 *
 * A clear from the keyboard hides the trigger that has the focus, so the focus
 * moves to the first control of the bar. A pointer press leaves the focus
 * alone, so a tap does not open the keyboard of a phone.
 *
 * Must render inside a `FormFilters`.
 */
export function FormFiltersClear({ children, variant, color, className }: FormFiltersClearProps) {
	const { clear, clearable } = useFormFilters()

	const { rail } = useFormFiltersAxis()

	const classes = cn(k({ idle: !clearable, rail }).clear, className)

	const handleClear = (event: MouseEvent) => {
		const trigger = event.currentTarget

		// A click from the keyboard has no press count.
		const keyboard = event.detail === 0 && trigger.contains(document.activeElement)

		clear()

		if (!keyboard) return

		const bar = trigger.closest('[data-slot="form-filters"]')

		// An overflowing `rail` row is a tab stop of its own, a scroll region. The
		// focus goes past it to the first control.
		getTabbableElements(bar)
			.find((element) => !trigger.contains(element) && element.getAttribute('role') !== 'region')
			?.focus()
	}

	// A single element child is cloned with the clear handler; anything else (a
	// bare string, several children) renders the default Button. `Children.only`
	// would throw on those instead of falling back as documented.
	if (isValidElement<{ onClick?: MouseEventHandler; className?: string }>(children)) {
		return cloneWithAction(
			children,
			handleClear,
			classes ? { className: cn(children.props.className, classes) } : undefined,
		)
	}

	return (
		<Button
			type="button"
			variant={variant}
			color={color}
			data-slot="form-filters-clear"
			onClick={handleClear}
			className={classes}
		>
			{children}
		</Button>
	)
}
