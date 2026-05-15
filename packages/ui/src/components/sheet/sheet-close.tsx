'use client'

import type { MouseEvent, MouseEventHandler, ReactElement } from 'react'
import { cloneElement } from 'react'
import { useSheetContext } from './context'

export type SheetCloseProps = {
	children: ReactElement<{ onClick?: MouseEventHandler }>
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
