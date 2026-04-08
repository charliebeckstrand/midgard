'use client'

import { cloneElement, isValidElement, type ReactElement } from 'react'
import { cn } from '../../core'
import { useDropdownContext } from './dropdown'

export type DropdownTriggerProps =
	| ({ children: ReactElement } & { className?: string })
	| React.ComponentPropsWithoutRef<'button'>

export function DropdownTrigger({ children, className, ...props }: DropdownTriggerProps) {
	const { open, setOpen, triggerRef } = useDropdownContext()

	const handleClick = (e: React.MouseEvent) => {
		if ('onClick' in props && typeof props.onClick === 'function') {
			props.onClick(e as React.MouseEvent<HTMLButtonElement>)
		}
		setOpen(!open)
	}

	// If the child is a React element, clone it and merge props
	if (isValidElement(children)) {
		return cloneElement(children as ReactElement<Record<string, unknown>>, {
			ref: triggerRef,
			'aria-haspopup': 'menu',
			'aria-expanded': open,
			'data-slot': 'dropdown-trigger',
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
			ref={triggerRef}
			type="button"
			aria-haspopup="menu"
			aria-expanded={open}
			data-slot="dropdown-trigger"
			onClick={handleClick}
			className={cn(className)}
			{...props}
		>
			{children}
		</button>
	)
}
