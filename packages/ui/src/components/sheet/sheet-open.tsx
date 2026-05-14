'use client'

import type { MouseEvent, MouseEventHandler, ReactElement } from 'react'
import { cloneElement } from 'react'

export type SheetOpenProps = {
	children: ReactElement<{ onClick?: MouseEventHandler }>
	onClick?: () => void
}

export function SheetOpen({ children, onClick }: SheetOpenProps) {
	return cloneElement(children, {
		onClick: (e: MouseEvent) => {
			children.props.onClick?.(e)
			onClick?.()
		},
	})
}
