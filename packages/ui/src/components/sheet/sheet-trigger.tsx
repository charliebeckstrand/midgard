'use client'

import type { MouseEvent, MouseEventHandler, ReactElement } from 'react'
import { cloneElement } from 'react'

export type SheetTriggerProps = {
	children: ReactElement<{ onClick?: MouseEventHandler }>
	onClick?: () => void
}

export function SheetTrigger({ children, onClick }: SheetTriggerProps) {
	return cloneElement(children, {
		onClick: (e: MouseEvent) => {
			children.props.onClick?.(e)
			onClick?.()
		},
	})
}
