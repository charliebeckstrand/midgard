'use client'

import {
	type Placement,
	useClientPoint,
	useDismiss,
	useInteractions,
	useRole,
} from '@floating-ui/react'
import { type MouseEvent, type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import { cn } from '../../core'
import { useFloatingPanel } from '../../hooks'
import { useDensity } from '../../primitives/density'
import type { Step } from '../../recipes/ryu/sun'
import { MenuActionsProvider, MenuStateProvider } from './context'

export type MenuProps = {
	defaultOpen?: boolean
	placement?: Placement
	/**
	 * Size step that drives menu item padding and text size.
	 * Resolution order: explicit prop, then enclosing concentric size, then `'md'`.
	 */
	size?: Step
	className?: string
	children: ReactNode
}

export function Menu({ defaultOpen = false, placement, size, className, children }: MenuProps) {
	const [open, setOpen] = useState(defaultOpen)

	const inherited = useDensity()
	const resolvedSize: Step = size ?? inherited.size

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

	const handleContextMenu = useCallback((e: MouseEvent) => {
		e.preventDefault()

		setPoint({ x: e.clientX, y: e.clientY })

		setOpen(true)
	}, [])

	const state = useMemo(
		() => ({
			open,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
			size: resolvedSize,
		}),
		[open, floatingStyles, getReferenceProps, getFloatingProps, resolvedSize],
	)

	const actions = useMemo(
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
