'use client'

import {
	type ComponentProps,
	isValidElement,
	type MouseEvent,
	type MouseEventHandler,
	type ReactNode,
} from 'react'
import { Button } from '../../../components/button'
import { cn } from '../../../core/cn'
import { composeEventHandlers } from '../../../core/compose-event-handlers'
import { cloneWithAction } from '../../../primitives/trigger-child/trigger-child'
import type { ButtonVariants } from '../../../recipes/kata/button'
import { k } from '../../../recipes/kata/form-filters'
import { getTabbableElements } from '../../../utilities/focusable-selector'
import { useFormFilters } from './context'

/**
 * The clear is the activation that the trigger exists to perform, so a caller
 * `preventDefault()` does not cancel it. The cloned child of `cloneWithAction`
 * follows the same rule (CONVENTIONS.md §3.9, the first case).
 */
const alwaysClear = { checkForDefaultPrevented: false }

/**
 * Props for {@link FormFiltersClear}. The fallback `<button>` takes the rest.
 * An element child carries its own props, so the rest does not reach it.
 */
export type FormFiltersClearProps = Omit<ComponentProps<'button'>, 'color' | 'children'> & {
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
	 * The button color of the fallback trigger. It defaults to the color of
	 * {@link Button}. An element child ignores it, as it ignores `variant`.
	 *
	 * @defaultValue `'zinc'`, or the button color of the surface around it, such as an Alert.
	 */
	color?: ButtonVariants['color']
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
 * to undo nothing. It takes no space until it appears, so the fields fill
 * the line of the bar while there is nothing to clear.
 *
 * A clear hides the trigger. When the trigger has the focus, the focus moves,
 * so it does not go to the `<body>`. After a clear from the keyboard, the focus
 * moves to the first control of the bar. After a pointer press, the focus moves
 * to the bar itself, so a tap does not open the keyboard of a phone.
 *
 * Must render inside a `FormFilters`.
 */
export function FormFiltersClear({
	children,
	variant,
	color,
	className,
	onClick,
	...props
}: FormFiltersClearProps) {
	const { clear, clearable } = useFormFilters()

	const classes = cn(k({ idle: !clearable }).clear, className)

	const handleClear = (event: MouseEvent) => {
		const trigger = event.currentTarget

		const focused = trigger.contains(document.activeElement)

		clear()

		if (!focused) return

		const bar = trigger.closest<HTMLElement>('[data-slot="form-filters"]')

		// A click from the keyboard has no press count. A pointer press moves the
		// focus to the bar, which opens no keyboard.
		if (event.detail !== 0) {
			bar?.focus()

			return
		}

		// An overflowing `rail` row is a tab stop of its own, a scroll region. The
		// focus goes past it to the first control, or to the bar when it has none.
		const first = getTabbableElements(bar).find(
			(element) => !trigger.contains(element) && element.getAttribute('role') !== 'region',
		)

		;(first ?? bar)?.focus()
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
			{...props}
			type="button"
			variant={variant}
			color={color}
			data-slot="form-filters-clear"
			onClick={composeEventHandlers(onClick, handleClear, alwaysClear)}
			className={classes}
		>
			{children}
		</Button>
	)
}
