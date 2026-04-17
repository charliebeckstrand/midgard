'use client'

import React from 'react'
import { useDrawerContext } from './drawer'

export type DrawerOpenProps = {
	children: React.ReactElement<{ onClick?: React.MouseEventHandler }>
	onClick?: () => void
}

export type DrawerCloseProps = {
	children: React.ReactElement<{ onClick?: React.MouseEventHandler }>
}

export function DrawerOpen({ children, onClick }: DrawerOpenProps) {
	return React.cloneElement(children, {
		onClick: (e: React.MouseEvent) => {
			children.props.onClick?.(e)
			onClick?.()
		},
	})
}

export function DrawerClose({ children }: DrawerCloseProps) {
	const { close } = useDrawerContext()

	return React.cloneElement(children, {
		onClick: (e: React.MouseEvent) => {
			children.props.onClick?.(e)
			close()
		},
	})
}
