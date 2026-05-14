'use client'

import type { MouseEvent, MouseEventHandler, ReactElement } from 'react'
import { cloneElement } from 'react'
import { useSheetContext } from './sheet'

export type SheetOpenProps = {
	children: ReactElement<{ onClick?: MouseEventHandler }>
	onClick?: () => void
}

export type SheetCloseProps = {
	children: ReactElement<{ onClick?: MouseEventHandler }>
}

export function SheetOpen({ children, onClick }: SheetOpenProps) {
	return cloneElement(children, {
		onClick: (e: MouseEvent) => {
			children.props.onClick?.(e)
			onClick?.()
		},
	})
}

export function SheetClose({ children }: SheetCloseProps) {
	const { close } = useSheetContext()

	return cloneElement(children, {
		onClick: (e: MouseEvent) => {
			children.props.onClick?.(e)
			close()
		},
	})
}
