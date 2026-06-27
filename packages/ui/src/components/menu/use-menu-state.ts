'use client'

import { type Placement, useClientPoint, useInteractions } from '@floating-ui/react'
import { type MouseEvent, useCallback, useId, useMemo, useState } from 'react'
import { useFloatingDisclosure } from '../../hooks'
import { useDensity } from '../../primitives/density'
import type { Step } from '../../recipes'

type MenuStateOptions = {
	open?: boolean
	defaultOpen?: boolean
	onOpenChange?: (open: boolean) => void
	placement?: Placement
	size?: Step
}

/**
 * Disclosure, positioning, and density state for {@link Menu}, split into a
 * `state`/`actions` pair plus the right-click `handleContextMenu` and an
 * `isDropdown` flag. Drives all three menu modes: dropdown (a `placement`),
 * right-click context menu (`useClientPoint` opening at the cursor but anchored
 * to the right-clicked element, so it tracks that element on scroll), and
 * static inline (`defaultOpen` with no `placement`).
 *
 * @internal
 * @see {@link useFloatingDisclosure}
 */
export function useMenuState({
	open: openProp,
	defaultOpen = false,
	onOpenChange,
	placement,
	size,
}: MenuStateOptions) {
	const inherited = useDensity()
	// An explicit `size` prop sets both density axes uniformly; otherwise each
	// axis inherits independently from the ambient Density token.
	const resolvedDensity: Step = size ?? inherited.space
	const resolvedSize: Step = size ?? inherited.size

	const [point, setPoint] = useState({ x: 0, y: 0 })

	const isDropdown = placement !== undefined

	const isStatic = defaultOpen && !isDropdown

	// The trigger (`aria-haspopup="menu"`) and the panel (`role="menu"`) carry
	// their own roles; `role: null` suppresses floating-ui's `useRole`, which
	// double-stamps the positioning wrapper. `menuId` wires the trigger's
	// `aria-controls` to the real menu panel.
	const menuId = useId()

	const { open, setOpen, close, triggerRef, refs, floatingStyles, context, dismiss, role } =
		useFloatingDisclosure({
			open: openProp,
			defaultOpen,
			onOpenChange,
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
		(event: MouseEvent) => {
			event.preventDefault()

			// The menu panel is portaled out of the DOM but stays a React child of
			// this wrapper, so its own contextmenu events bubble back here. A
			// right-click inside the open panel must not re-anchor or reposition it:
			// anchoring to an element within the floating panel would make the menu
			// chase its own moving rect, jittering it across the screen. Suppress
			// the native menu (above) and leave the panel where it is.
			if (refs.floating.current?.contains(event.target as Node)) return

			// Anchor the menu to the right-clicked element, not just the cursor
			// coordinates. `useClientPoint` reads this reference as its virtual
			// element's `contextElement` and re-derives the cursor point from the
			// element's live rect on every `autoUpdate` tick, so the menu opens at
			// the cursor yet follows the element as the page (or a scroll container)
			// scrolls. With no reference set the point stays fixed in the viewport
			// and the menu floats free of the item it was invoked on.
			if (event.target instanceof Element) refs.setReference(event.target)

			setPoint({ x: event.clientX, y: event.clientY })

			setOpen(true)
		},
		[setOpen, refs],
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
