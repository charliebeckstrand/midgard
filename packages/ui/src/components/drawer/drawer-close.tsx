'use client'

import type { MouseEvent, MouseEventHandler, ReactElement } from 'react'
import { cloneElement } from 'react'
import { useDrawerContext } from './drawer'

export type DrawerCloseProps = {
	children: ReactElement<{ onClick?: MouseEventHandler }>
}

export function DrawerClose({ children }: DrawerCloseProps) {
	const { close } = useDrawerContext()

	return cloneElement(children, {
		onClick: (e: MouseEvent) => {
			children.props.onClick?.(e)
			close()
		},
	})
}
