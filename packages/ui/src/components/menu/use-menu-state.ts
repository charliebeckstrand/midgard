'use client'

import { type Placement, useInteractions } from '@floating-ui/react'
import { type MouseEvent, useCallback, useId, useMemo } from 'react'
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
 * A position-only virtual reference for a right-click menu: a zero-size point at
 * the cursor that rides `element` as it scrolls. `contextElement` ties it to the
 * right-clicked element so `autoUpdate` tracks that element's scroll container,
 * while the cursor offset captured on the first read holds the menu at the same
 * spot within it. Set via `setPositionReference`, never `setReference`, so the
 * element is not floating-ui's dismissal reference — a press on it dismisses the
 * menu like any other outside press. Falls back to a fixed viewport point when
 * the right-click resolves to no element.
 *
 * @internal
 */
function cursorAnchor(element: Element | null, clientX: number, clientY: number) {
	let offsetX: number | null = null
	let offsetY: number | null = null

	return {
		contextElement: element ?? undefined,
		getBoundingClientRect() {
			const rect = element?.getBoundingClientRect()

			const baseX = rect?.x ?? clientX
			const baseY = rect?.y ?? clientY

			// Capture the cursor's offset within the element on the first read, then
			// subtract it on every tick so the point rides the element as it scrolls.
			offsetX ??= baseX - clientX
			offsetY ??= baseY - clientY

			const x = baseX - offsetX
			const y = baseY - offsetY

			return { width: 0, height: 0, x, y, top: y, right: x, bottom: y, left: x }
		},
	}
}

/**
 * Disclosure, positioning, and density state for {@link Menu}, split into a
 * `state`/`actions` pair plus the right-click `handleContextMenu` and an
 * `isDropdown` flag. Drives all three menu modes: dropdown (a `placement`),
 * right-click context menu (a position-only {@link cursorAnchor} opening at the
 * cursor yet tracking the right-clicked element on scroll), and static inline
 * (`defaultOpen` with no `placement`).
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

	const isDropdown = placement !== undefined

	const isStatic = defaultOpen && !isDropdown

	// The trigger (`aria-haspopup="menu"`) and the panel (`role="menu"`) carry
	// their own roles; `role: null` suppresses floating-ui's `useRole`, which
	// double-stamps the positioning wrapper. `menuId` wires the trigger's
	// `aria-controls` to the real menu panel.
	const menuId = useId()

	const { open, setOpen, close, triggerRef, refs, floatingStyles, dismiss, role } =
		useFloatingDisclosure({
			open: openProp,
			defaultOpen,
			onOpenChange,
			role: null,
			placement: placement ?? 'bottom-start',
			matchReferenceWidth: isDropdown,
		})

	const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, role])

	// Anchor the menu at a point while tracking `element` as it (or a scroll
	// container) scrolls — but as the *position* reference only, never floating-ui's
	// `reference`. Registering the element as the reference (`setReference`, the
	// `useClientPoint` route) would exempt it from outside-press dismissal, so a
	// left-click on the very element the menu was opened from could not close it; a
	// position-only anchor keeps it a normal outside-press target.
	const openAt = useCallback(
		(element: Element | null, clientX: number, clientY: number) => {
			refs.setPositionReference(cursorAnchor(element, clientX, clientY))

			setOpen(true)
		},
		[setOpen, refs],
	)

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

			openAt(event.target instanceof Element ? event.target : null, event.clientX, event.clientY)
		},
		[openAt, refs],
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
			openAt,
		}),
		[setOpen, close, isStatic, triggerRef, refs.setReference, refs.setFloating, openAt],
	)

	return { state, actions, handleContextMenu, isDropdown }
}
