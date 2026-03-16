'use client'

import type React from 'react'
import { cloneElement, isValidElement, type ReactElement } from 'react'
import { useSheet } from './context'

export function SheetClose({
	asChild,
	children,
	...props
}: {
	asChild?: boolean
	children: React.ReactElement | React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'button'>, 'children'>) {
	const { onOpenChange } = useSheet()

	if (asChild && isValidElement(children)) {
		return cloneElement(children as ReactElement<Record<string, unknown>>, {
			onClick: (e: React.MouseEvent) => {
				const childOnClick = (children as ReactElement<Record<string, unknown>>).props.onClick as
					| ((e: React.MouseEvent) => void)
					| undefined
				childOnClick?.(e)
				onOpenChange(false)
			},
		})
	}

	return (
		<button type="button" onClick={() => onOpenChange(false)} {...props}>
			{children}
		</button>
	)
}
