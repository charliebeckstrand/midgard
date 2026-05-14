'use client'

import type { MouseEvent, MouseEventHandler, ReactElement } from 'react'
import { cloneElement } from 'react'

export type DrawerOpenProps = {
	children: ReactElement<{ onClick?: MouseEventHandler }>
	onClick?: () => void
}

export function DrawerOpen({ children, onClick }: DrawerOpenProps) {
	return cloneElement(children, {
		onClick: (e: MouseEvent) => {
			children.props.onClick?.(e)
			onClick?.()
		},
	})
}
