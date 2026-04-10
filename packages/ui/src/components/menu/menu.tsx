'use client'

import {
	autoUpdate,
	flip,
	offset,
	type Placement,
	shift,
	size,
	useClientPoint,
	useDismiss,
	useFloating,
	useInteractions,
	useRole,
} from '@floating-ui/react'
import type React from 'react'
import { useCallback, useRef, useState } from 'react'
import { cn, createContext } from '../../core'

type MenuContextValue = {
	open: boolean
	setOpen: (open: boolean) => void
	close: () => void
	static: boolean
	triggerRef: React.RefObject<HTMLButtonElement | null>
	setReference: (node: HTMLElement | null) => void
	setFloating: (node: HTMLElement | null) => void
	floatingStyles: React.CSSProperties
	getReferenceProps: () => Record<string, unknown>
	getFloatingProps: () => Record<string, unknown>
}

export const [MenuProvider, useMenuContext] = createContext<MenuContextValue>('Menu')

export type MenuProps = {
	defaultOpen?: boolean
	placement?: Placement
	className?: string
	children: React.ReactNode
}

export function Menu({ defaultOpen = false, placement, className, children }: MenuProps) {
	const [open, setOpen] = useState(defaultOpen)

	const [point, setPoint] = useState({ x: 0, y: 0 })

	const triggerRef = useRef<HTMLButtonElement>(null)

	const isDropdown = placement !== undefined

	const isStatic = defaultOpen && !isDropdown

	const { refs, floatingStyles, context } = useFloating({
		placement: placement ?? 'bottom-start',
		open,
		onOpenChange: setOpen,
		whileElementsMounted: autoUpdate,
		middleware: [
			offset(4),
			flip(),
			shift({ padding: 8 }),
			...(isDropdown
				? [
						size({
							apply({ rects, elements }) {
								Object.assign(elements.floating.style, {
									minWidth: `${rects.reference.width}px`,
								})
							},
						}),
					]
				: []),
		],
	})

	const clientPoint = useClientPoint(context, {
		enabled: !isDropdown && open,
		x: point.x,
		y: point.y,
	})

	const dismiss = useDismiss(context)

	const role = useRole(context, { role: 'menu' })

	const { getReferenceProps, getFloatingProps } = useInteractions([
		...(isDropdown ? [] : [clientPoint]),
		dismiss,
		role,
	])

	const close = useCallback(() => {
		setOpen(false)

		if (isDropdown) {
			triggerRef.current?.focus()
		}
	}, [isDropdown])

	const handleContextMenu = useCallback((e: React.MouseEvent) => {
		e.preventDefault()

		setPoint({ x: e.clientX, y: e.clientY })

		setOpen(true)
	}, [])

	return (
		<MenuProvider
			value={{
				open,
				setOpen,
				close,
				static: isStatic,
				triggerRef,
				setReference: refs.setReference,
				setFloating: refs.setFloating,
				floatingStyles,
				getReferenceProps,
				getFloatingProps,
			}}
		>
			<div
				data-slot="menu"
				className={cn(className)}
				{...(!isDropdown && { role: 'application', onContextMenu: handleContextMenu })}
			>
				{children}
			</div>
		</MenuProvider>
	)
}
