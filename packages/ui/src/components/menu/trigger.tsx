'use client'

import {
	type ComponentPropsWithoutRef,
	cloneElement,
	isValidElement,
	type MouseEvent,
	type MutableRefObject,
	type ReactElement,
	useCallback,
} from 'react'
import { cn } from '../../core'
import { useMenuActions, useMenuState } from './menu'

export type MenuTriggerProps =
	| ({ children: ReactElement } & { className?: string })
	| ComponentPropsWithoutRef<'button'>

export function MenuTrigger({ children, className, ...props }: MenuTriggerProps) {
	const { open, getReferenceProps } = useMenuState()
	const { setOpen, triggerRef, setReference } = useMenuActions()

	const mergeRefs = useCallback(
		(node: HTMLElement | null) => {
			;(triggerRef as MutableRefObject<HTMLButtonElement | null>).current =
				node as HTMLButtonElement | null
			setReference(node)
		},
		[triggerRef, setReference],
	)

	const referenceProps = getReferenceProps()

	// If the child is a React element, clone it and merge props
	if (isValidElement(children)) {
		return cloneElement(children as ReactElement<Record<string, unknown>>, {
			ref: mergeRefs,
			'aria-haspopup': 'menu',
			'aria-expanded': open,
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
			data-slot="menu-trigger"
			onClick={() => setOpen(!open)}
			className={cn(className)}
			{...referenceProps}
			{...props}
		>
			{children}
		</button>
	)
}
