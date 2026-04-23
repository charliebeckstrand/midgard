'use client'

import type { MouseEvent, MouseEventHandler, ReactElement } from 'react'
import { cloneElement } from 'react'
import { useDrawerContext } from './drawer'

export type DrawerOpenProps = {
	children: ReactElement<{ onClick?: MouseEventHandler }>
	onClick?: () => void
}

export type DrawerCloseProps = {
	children: ReactElement<{ onClick?: MouseEventHandler }>
}

export function DrawerOpen({ children, onClick }: DrawerOpenProps) {
	return cloneElement(children, {
		onClick: (e: MouseEvent) => {
			children.props.onClick?.(e)
			onClick?.()
		},
	})
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
