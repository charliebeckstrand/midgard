'use client'

import type React from 'react'
import { cloneElement, isValidElement, type ReactElement } from 'react'
import { useSheet } from './context'

type SheetButtonProps = {
	asChild?: boolean
	children: React.ReactElement | React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'button'>, 'children'>

function SheetButton({
	asChild,
	children,
	action,
	...props
}: SheetButtonProps & { action: () => void }) {
	if (asChild && isValidElement(children)) {
		return cloneElement(children as ReactElement<Record<string, unknown>>, {
			onClick: (e: React.MouseEvent) => {
				const childOnClick = (children as ReactElement<Record<string, unknown>>).props.onClick as
					| ((e: React.MouseEvent) => void)
					| undefined
				childOnClick?.(e)
				action()
			},
		})
	}

	return (
		<button type="button" onClick={action} {...props}>
			{children}
		</button>
	)
}

export function SheetOpen(props: SheetButtonProps) {
	const { onOpenChange } = useSheet()
	return <SheetButton {...props} action={() => onOpenChange(true)} />
}

export function SheetClose(props: SheetButtonProps) {
	const { onOpenChange } = useSheet()
	return <SheetButton {...props} action={() => onOpenChange(false)} />
}
