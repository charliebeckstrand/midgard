'use client'

import {
	autoUpdate,
	flip,
	offset,
	shift,
	useClientPoint,
	useDismiss,
	useFloating,
	useInteractions,
	useRole,
} from '@floating-ui/react'
import type React from 'react'
import { useCallback, useState } from 'react'
import { cn, createContext } from '../../core'

type MenuContextValue = {
	open: boolean
	setOpen: (open: boolean) => void
	close: () => void
	setFloating: (node: HTMLElement | null) => void
	floatingStyles: React.CSSProperties
	getFloatingProps: () => Record<string, unknown>
}

export const [MenuProvider, useMenuContext] = createContext<MenuContextValue>('Menu')

export type MenuProps = {
	className?: string
	children: React.ReactNode
}

export function Menu({ className, children }: MenuProps) {
	const [open, setOpen] = useState(false)
	const [point, setPoint] = useState({ x: 0, y: 0 })

	const { refs, floatingStyles, context } = useFloating({
		placement: 'bottom-start',
		open,
		onOpenChange: setOpen,
		whileElementsMounted: autoUpdate,
		middleware: [offset(4), flip(), shift({ padding: 8 })],
	})

	const clientPoint = useClientPoint(context, {
		enabled: open,
		x: point.x,
		y: point.y,
	})

	const dismiss = useDismiss(context)
	const role = useRole(context, { role: 'menu' })

	const { getFloatingProps } = useInteractions([clientPoint, dismiss, role])

	const close = useCallback(() => setOpen(false), [])

	const handleContextMenu = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault()
			setPoint({ x: e.clientX, y: e.clientY })
			setOpen(true)
		},
		[],
	)

	return (
		<MenuProvider
			value={{
				open,
				setOpen,
				close,
				setFloating: refs.setFloating,
				floatingStyles,
				getFloatingProps,
			}}
		>
			<div data-slot="menu" className={cn(className)} onContextMenu={handleContextMenu}>
				{children}
			</div>
		</MenuProvider>
	)
}
