'use client'

import {
	type Placement,
	useClientPoint,
	useDismiss,
	useInteractions,
	useRole,
} from '@floating-ui/react'
import type React from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { cn, createContext } from '../../core'
import { useFloatingPanel } from '../../hooks'

type MenuStateValue = {
	open: boolean
	floatingStyles: React.CSSProperties
	getReferenceProps: () => Record<string, unknown>
	getFloatingProps: () => Record<string, unknown>
}

type MenuActionsValue = {
	setOpen: (open: boolean) => void
	close: () => void
	static: boolean
	triggerRef: React.RefObject<HTMLButtonElement | null>
	setReference: (node: HTMLElement | null) => void
	setFloating: (node: HTMLElement | null) => void
}

export type MenuContextValue = MenuStateValue & MenuActionsValue

const [MenuStateProvider, useMenuState] = createContext<MenuStateValue>('Menu')
const [MenuActionsProvider, useMenuActions] = createContext<MenuActionsValue>('Menu')

export { useMenuActions, useMenuState }

/** Returns combined state + actions. Prefer `useMenuActions` in leaves that only need `close`. */
export function useMenuContext(): MenuContextValue {
	const state = useMenuState()
	const actions = useMenuActions()

	return { ...state, ...actions }
}

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

	const { refs, floatingStyles, context } = useFloatingPanel({
		placement: placement ?? 'bottom-start',
		open,
		onOpenChange: setOpen,
		matchReferenceWidth: isDropdown,
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

	const state = useMemo<MenuStateValue>(
		() => ({
			open,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
		}),
		[open, floatingStyles, getReferenceProps, getFloatingProps],
	)

	const actions = useMemo<MenuActionsValue>(
		() => ({
			setOpen,
			close,
			static: isStatic,
			triggerRef,
			setReference: refs.setReference,
			setFloating: refs.setFloating,
		}),
		[close, isStatic, refs.setReference, refs.setFloating],
	)

	return (
		<MenuActionsProvider value={actions}>
			<MenuStateProvider value={state}>
				<div
					data-slot="menu"
					className={cn(className)}
					{...(!isDropdown && { role: 'application', onContextMenu: handleContextMenu })}
				>
					{children}
				</div>
			</MenuStateProvider>
		</MenuActionsProvider>
	)
}
