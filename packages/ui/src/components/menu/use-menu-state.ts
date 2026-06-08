'use client'

import { type Placement, useClientPoint, useInteractions } from '@floating-ui/react'
import { type MouseEvent, useCallback, useId, useMemo, useState } from 'react'
import { useFloatingDisclosure } from '../../hooks'
import { useDensity } from '../../primitives/density'
import type { Step } from '../../recipes'

type MenuStateOptions = {
	defaultOpen?: boolean
	placement?: Placement
	size?: Step
}

export function useMenuState({ defaultOpen = false, placement, size }: MenuStateOptions) {
	const inherited = useDensity()
	// An explicit `size` prop is a single knob that sets both axes (diagonal);
	// otherwise each axis inherits independently from the ambient token.
	const resolvedDensity: Step = size ?? inherited.space
	const resolvedSize: Step = size ?? inherited.size

	const [point, setPoint] = useState({ x: 0, y: 0 })

	const isDropdown = placement !== undefined

	const isStatic = defaultOpen && !isDropdown

	// The trigger (`aria-haspopup="menu"`) and the panel (`role="menu"`) carry
	// their own roles + popup wiring; suppress floating-ui's role so the
	// positioning wrapper isn't double-stamped. `menuId` lets the trigger's
	// `aria-controls` point at the real menu panel rather than that wrapper.
	const menuId = useId()

	const { open, setOpen, close, triggerRef, refs, floatingStyles, context, dismiss, role } =
		useFloatingDisclosure({
			defaultOpen,
			role: null,
			placement: placement ?? 'bottom-start',
			matchReferenceWidth: isDropdown,
		})

	const clientPoint = useClientPoint(context, {
		enabled: !isDropdown && open,
		x: point.x,
		y: point.y,
	})

	const { getReferenceProps, getFloatingProps } = useInteractions([
		...(isDropdown ? [] : [clientPoint]),
		dismiss,
		role,
	])

	const handleContextMenu = useCallback(
		(e: MouseEvent) => {
			e.preventDefault()

			setPoint({ x: e.clientX, y: e.clientY })

			setOpen(true)
		},
		[setOpen],
	)

	const state = useMemo(
		() => ({
			open,
			menuId,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
			density: resolvedDensity,
			size: resolvedSize,
		}),
		[
			open,
			menuId,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
			resolvedDensity,
			resolvedSize,
		],
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
		[setOpen, close, isStatic, triggerRef, refs.setReference, refs.setFloating],
	)

	return { state, actions, handleContextMenu, isDropdown }
}
