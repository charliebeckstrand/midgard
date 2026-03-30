'use client'

import React from 'react'
import { useSheetContext } from './sheet'

export type SheetOpenProps = {
	children: React.ReactElement<{ onClick?: React.MouseEventHandler }>
	onClick?: () => void
}

export type SheetCloseProps = {
	children: React.ReactElement<{ onClick?: React.MouseEventHandler }>
}

export function SheetOpen({ children, onClick }: SheetOpenProps) {
	return React.cloneElement(children, {
		onClick: (e: React.MouseEvent) => {
			children.props.onClick?.(e)
			onClick?.()
		},
	})
}

export function SheetClose({ children }: SheetCloseProps) {
	const { onClose } = useSheetContext()

	return React.cloneElement(children, {
		onClick: (e: React.MouseEvent) => {
			children.props.onClick?.(e)
			onClose()
		},
	})
}
