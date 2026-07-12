'use client'

import {
	type ComponentPropsWithoutRef,
	cloneElement,
	isValidElement,
	type KeyboardEvent,
	type MouseEvent,
	type ReactElement,
} from 'react'
import { cn } from '../../core'
import { useComposedRef } from '../../hooks'
import { useMenuActions, useMenuState } from './context'

/** Props for {@link MenuTrigger}: either a single child element to clone or native `<button>` attributes. */
export type MenuTriggerProps =
	| ({ children: ReactElement } & { className?: string })
	| ComponentPropsWithoutRef<'button'>

/**
 * Disclosure trigger for a dropdown {@link Menu}. Clones a single child element
 * or renders its own `<button>`, wiring `aria-haspopup="menu"`,
 * `aria-expanded`, and `aria-controls` and toggling open state on click while
 * composing with the consumer's own `onClick`.
 *
 * The trigger keeps focus while the menu is open, so Tab off it closes the menu
 * and lets focus proceed to the next tabbable in one keystroke.
 */
export function MenuTrigger({ children, className, ...props }: MenuTriggerProps) {
	const { open, menuId, getReferenceProps } = useMenuState()

	const { setOpen, dismissToTab, triggerRef, setReference } = useMenuActions()

	const mergeRefs = useComposedRef<HTMLButtonElement>(triggerRef, setReference)

	// Focus rests on the trigger while the menu is open, so Tab (either direction)
	// arrives here rather than in the panel. Close on it without `preventDefault`,
	// letting the browser carry focus onward; `dismissToTab` marks the close
	// `'focus-out'` so focus is not yanked back to the trigger.
	const closeOnTab = (event: KeyboardEvent) => {
		if (open && event.key === 'Tab') dismissToTab(event.nativeEvent)
	}

	// Consumer/child props route through `getReferenceProps`, which composes
	// their event handlers with the floating interactions instead of clobbering
	// them (the `TooltipTrigger`/`PopoverTrigger` pattern). The toggle composes
	// with the consumer's own onClick: theirs runs first.
	if (isValidElement(children)) {
		const child = children as ReactElement<Record<string, unknown>>

		const childOnClick = child.props.onClick as ((event: MouseEvent) => void) | undefined

		const childOnKeyDown = child.props.onKeyDown as ((event: KeyboardEvent) => void) | undefined

		return cloneElement(child, {
			...getReferenceProps({
				...child.props,
				onClick: (event: MouseEvent) => {
					childOnClick?.(event)
					setOpen(!open)
				},
				onKeyDown: (event: KeyboardEvent) => {
					childOnKeyDown?.(event)
					closeOnTab(event)
				},
			}),
			ref: mergeRefs,
			'aria-haspopup': 'menu',
			'aria-expanded': open,
			'aria-controls': open ? menuId : undefined,
			'data-slot': 'menu-trigger',
			className: cn(className, child.props.className as string | undefined),
		})
	}

	const {
		onClick: consumerOnClick,
		onKeyDown: consumerOnKeyDown,
		...rest
	} = props as ComponentPropsWithoutRef<'button'>

	return (
		<button
			ref={mergeRefs}
			type="button"
			aria-haspopup="menu"
			aria-expanded={open}
			aria-controls={open ? menuId : undefined}
			data-slot="menu-trigger"
			className={cn(className)}
			{...getReferenceProps({
				...rest,
				onClick: (event: MouseEvent<HTMLButtonElement>) => {
					consumerOnClick?.(event)
					setOpen(!open)
				},
				onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
					consumerOnKeyDown?.(event)
					closeOnTab(event)
				},
			})}
		>
			{children}
		</button>
	)
}
