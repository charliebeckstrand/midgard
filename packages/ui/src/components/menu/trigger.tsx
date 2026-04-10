'use client'

import { cloneElement, isValidElement, type ReactElement, useCallback } from 'react'
import { cn } from '../../core'
import { useMenuContext } from './menu'

export type MenuTriggerProps =
	| ({ children: ReactElement } & { className?: string })
	| React.ComponentPropsWithoutRef<'button'>

export function MenuTrigger({ children, className, ...props }: MenuTriggerProps) {
	const { open, setOpen, triggerRef, setReference, getReferenceProps } = useMenuContext()

	const mergeRefs = useCallback(
		(node: HTMLElement | null) => {
			;(triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current =
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
			onClick: (e: React.MouseEvent) => {
				const childOnClick = (children as ReactElement<Record<string, unknown>>).props?.onClick as
					| ((e: React.MouseEvent) => void)
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
