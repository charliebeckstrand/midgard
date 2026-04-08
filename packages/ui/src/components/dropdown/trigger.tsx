'use client'

import { cloneElement, isValidElement, type ReactElement, useCallback } from 'react'
import { cn } from '../../core'
import { useDropdownContext } from './dropdown'

export type DropdownTriggerProps =
	| ({ children: ReactElement } & { className?: string })
	| React.ComponentPropsWithoutRef<'button'>

export function DropdownTrigger({ children, className, ...props }: DropdownTriggerProps) {
	const { open, setOpen, triggerRef, setReference, getReferenceProps } = useDropdownContext()

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
			'data-slot': 'dropdown-trigger',
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
			data-slot="dropdown-trigger"
			onClick={() => setOpen(!open)}
			className={cn(className)}
			{...referenceProps}
			{...props}
		>
			{children}
		</button>
	)
}
