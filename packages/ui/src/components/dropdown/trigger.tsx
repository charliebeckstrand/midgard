'use client'

import type React from 'react'
import { cn } from '../../core'
import { useDropdownContext } from './dropdown'

export type DropdownButtonProps = React.ComponentPropsWithoutRef<'button'>

export function DropdownButton({ className, onClick, ...props }: DropdownButtonProps) {
	const { open, setOpen, triggerRef } = useDropdownContext()

	return (
		<button
			ref={triggerRef}
			type="button"
			aria-haspopup="menu"
			aria-expanded={open}
			data-slot="dropdown-button"
			onClick={(e) => {
				onClick?.(e)
				setOpen(!open)
			}}
			className={cn(className)}
			{...props}
		/>
	)
}
