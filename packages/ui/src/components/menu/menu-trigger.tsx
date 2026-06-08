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

export type MenuTriggerProps =
	| ({ children: ReactElement } & { className?: string })
	| ComponentPropsWithoutRef<'button'>

export function MenuTrigger({ children, className, ...props }: MenuTriggerProps) {
	const { open, menuId, getReferenceProps } = useMenuState()
	const { setOpen, triggerRef, setReference } = useMenuActions()

	const mergeRefs = useComposedRef<HTMLButtonElement>(triggerRef, setReference)

	const referenceProps = getReferenceProps()

	// If the child is a React element, clone it and merge props
	if (isValidElement(children)) {
		return cloneElement(children as ReactElement<Record<string, unknown>>, {
			ref: mergeRefs,
			'aria-haspopup': 'menu',
			'aria-expanded': open,
			'aria-controls': open ? menuId : undefined,
			'data-slot': 'menu-trigger',
			...referenceProps,
			onClick: (e: MouseEvent) => {
				const childOnClick = (children as ReactElement<Record<string, unknown>>).props?.onClick as
					| ((e: MouseEvent) => void)
					| undefined
				childOnClick?.(e)
				setOpen(!open)
			},
		})
	}

	// Fallback: render a plain button
	return (
		<button
			ref={mergeRefs}
			type="button"
			aria-haspopup="menu"
			aria-expanded={open}
			aria-controls={open ? menuId : undefined}
			data-slot="menu-trigger"
			className={cn(className)}
			{...referenceProps}
			{...props}
			// After the spreads so a consumer-supplied onClick can't clobber the
			// toggle; compose both, mirroring the element branch above.
			onClick={(e: MouseEvent<HTMLButtonElement>) => {
				;(props as ComponentPropsWithoutRef<'button'>).onClick?.(e)
				setOpen(!open)
			}}
		>
			{children}
		</button>
	)
}
