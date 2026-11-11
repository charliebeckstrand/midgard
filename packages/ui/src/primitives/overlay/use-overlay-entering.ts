'use client'

import { type RefObject, useLayoutEffect, useRef } from 'react'
import { useHydrated } from '../../hooks/use-hydrated'
import { registerEnteringOverlay } from '../../utilities/overlay-layers'

/**
 * Records the fade of the backdrop of an overlay, from the commit of the open
 * to the arrival of the backdrop (see `isUnderEnteringOverlay`). A part of the
 * page under the overlay, such as the selection of a Map, then holds a change
 * that comes with the open until the backdrop covers the page.
 *
 * @remarks The record starts in a layout effect, so it is there in the commit
 * that opens the overlay, before the first paint. The close ends it, and so
 * does the arrival. An overlay that the hydration restores at rest plays no
 * fade, so it makes no record. Nor does an overlay that the reveal of an
 * `<Activity>` or a Suspense boundary shows again after its backdrop arrived.
 *
 * @param open - Whether the overlay is open.
 * @param backdrop - Whether the backdrop paints. A backdrop with no paint covers nothing.
 * @param container - The container that the overlay covers. With none, the overlay covers the viewport.
 * @param nodeRef - The root node of the overlay.
 * @param arrival - The `animate` target of the backdrop motion, compared by identity.
 * @returns `onAnimationComplete` for the backdrop.
 * @internal
 */
export function useOverlayEntering(
	open: boolean,
	backdrop: boolean,
	container: HTMLElement | null | undefined,
	nodeRef: RefObject<Element | null>,
	arrival: unknown,
): (definition: unknown) => void {
	const hydrated = useHydrated()

	// An overlay open in the hydration render is at rest. The first close clears it.
	const restingRef = useRef(open && !hydrated)

	const arrivedRef = useRef(false)

	const leaveRef = useRef<(() => void) | null>(null)

	useLayoutEffect(() => {
		if (!open) {
			restingRef.current = false

			arrivedRef.current = false

			return
		}

		if (!backdrop || restingRef.current || arrivedRef.current) return

		const leave = registerEnteringOverlay({
			node: () => nodeRef.current,
			scope: container ?? null,
		})

		leaveRef.current = leave

		return () => {
			leave()

			leaveRef.current = null
		}
	}, [open, backdrop, container, nodeRef])

	return (definition) => {
		if (definition !== arrival) return

		arrivedRef.current = true

		leaveRef.current?.()

		leaveRef.current = null
	}
}
