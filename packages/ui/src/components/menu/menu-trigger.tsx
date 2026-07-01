'use client'

import {
	type ComponentPropsWithoutRef,
	cloneElement,
	isValidElement,
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
 */
export function MenuTrigger({ children, className, ...props }: MenuTriggerProps) {
	const { open, menuId, getReferenceProps } = useMenuState()

	const { setOpen, triggerRef, setReference } = useMenuActions()

	const mergeRefs = useComposedRef<HTMLButtonElement>(triggerRef, setReference)

	// Consumer/child props route through `getReferenceProps`, which composes
	// their event handlers with the floating interactions instead of clobbering
	// them (the `TooltipTrigger`/`PopoverTrigger` pattern). The toggle composes
	// with the consumer's own onClick: theirs runs first.
	if (isValidElement(children)) {
		const child = children as ReactElement<Record<string, unknown>>

		const childOnClick = child.props.onClick as ((event: MouseEvent) => void) | undefined

		return cloneElement(child, {
			...getReferenceProps({
				...child.props,
				onClick: (event: MouseEvent) => {
					childOnClick?.(event)
					setOpen(!open)
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

	const { onClick: consumerOnClick, ...rest } = props as ComponentPropsWithoutRef<'button'>

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
			})}
		>
			{children}
		</button>
	)
}
