'use client'

import type React from 'react'
import { useSheet } from './context'

export function SheetTrigger({
	asChild,
	children,
	...props
}: {
	asChild?: boolean
	children: React.ReactElement | React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'button'>, 'children'>) {
	const { onOpenChange } = useSheet()

	if (asChild && children && typeof children === 'object' && 'type' in children) {
		const child = children as React.ReactElement<Record<string, unknown>>
		return {
			...child,
			props: {
				...child.props,
				onClick: (e: React.MouseEvent) => {
					const childOnClick = child.props.onClick as ((e: React.MouseEvent) => void) | undefined
					childOnClick?.(e)
					onOpenChange(true)
				},
			},
		} as React.ReactElement
	}

	return (
		<button type="button" onClick={() => onOpenChange(true)} {...props}>
			{children}
		</button>
	)
}
