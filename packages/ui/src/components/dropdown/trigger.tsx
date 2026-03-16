'use client'

import type React from 'react'
import { useDropdown } from './context'

export function DropdownButton<T extends React.ElementType = 'button'>({
	as,
	...props
}: { as?: T; className?: string } & Omit<React.ComponentPropsWithoutRef<T>, 'className'>) {
	const { toggle, open } = useDropdown()
	const Component = (as || 'button') as React.ElementType

	return (
		<Component
			{...props}
			aria-expanded={open}
			aria-haspopup="menu"
			onClick={(e: React.MouseEvent) => {
				const onClickProp = (props as { onClick?: (e: React.MouseEvent) => void }).onClick
				onClickProp?.(e)
				toggle()
			}}
		/>
	)
}
