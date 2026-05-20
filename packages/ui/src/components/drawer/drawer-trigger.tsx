'use client'

import type { MouseEvent, MouseEventHandler, ReactElement } from 'react'
import { cloneElement } from 'react'

export type DrawerTriggerProps = {
	children: ReactElement<{ onClick?: MouseEventHandler }>
	onClick?: () => void
}

export function DrawerTrigger({ children, onClick }: DrawerTriggerProps) {
	return cloneElement(children, {
		onClick: (e: MouseEvent) => {
			children.props.onClick?.(e)
			onClick?.()
		},
	})
}
