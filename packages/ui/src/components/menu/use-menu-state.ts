'use client'

import {
	type Placement,
	useClientPoint,
	useDismiss,
	useInteractions,
	useRole,
} from '@floating-ui/react'
import { type MouseEvent, useCallback, useMemo, useRef, useState } from 'react'
import { useFloatingPanel } from '../../hooks'
import { useDensity } from '../../primitives/density'
import type { Step } from '../../recipes/ryu/sun'

export type UseMenuStateOptions = {
	defaultOpen?: boolean
	placement?: Placement
	size?: Step
}

export function useMenuState({ defaultOpen = false, placement, size }: UseMenuStateOptions) {
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
		restoreFocusTo: isDropdown ? triggerRef : undefined,
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
	}, [])

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

	return { state, actions, handleContextMenu, isDropdown }
}
