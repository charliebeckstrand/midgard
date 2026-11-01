'use client'

import { type RefObject, useLayoutEffect } from 'react'

/**
 * Fits the box of an overlay that is fixed to the viewport to the visual
 * viewport, so a panel on the bottom edge stays above the on-screen keyboard.
 *
 * @remarks On iOS, the keyboard does not make the layout viewport smaller. It
 * covers the bottom of the page, and only the visual viewport gets smaller. A
 * box that is fixed to the viewport thus stays under the keyboard, and a drawer
 * on its bottom edge goes behind the keyboard. The hook sets the top and bottom
 * of the box to the edges of the visual viewport while the visual viewport
 * changes, and clears them when it stops. The backdrop keeps the full
 * viewport, so the page under a translucent keyboard stays dim.
 *
 * A pinch zoom also makes the visual viewport smaller, but the page is then
 * larger, not covered. The box then keeps the full viewport.
 *
 * @param node - The box of the overlay, or `null` before it mounts.
 * @param backdropRef - The backdrop in the box, if it renders.
 * @param active - Whether the box is fixed to the viewport and on screen.
 * @internal
 */
export function useOverlayViewportFit(
	node: HTMLElement | null,
	backdropRef: RefObject<HTMLElement | null>,
	active: boolean,
): void {
	useLayoutEffect(() => {
		const viewport = window.visualViewport

		if (!active || !node || !viewport) return

		const fit = () => {
			// A pinch zoom moves no edge of the box.
			const zoomed = Math.abs(viewport.scale - 1) > 0.01

			const top = zoomed ? 0 : Math.max(0, viewport.offsetTop)

			const bottom = zoomed
				? 0
				: Math.max(0, window.innerHeight - viewport.offsetTop - viewport.height)

			setEdges(node, top, bottom)

			// The backdrop goes out past the box by the same amounts.
			if (backdropRef.current) setEdges(backdropRef.current, -top, -bottom)
		}

		fit()

		viewport.addEventListener('resize', fit)

		viewport.addEventListener('scroll', fit)

		return () => {
			viewport.removeEventListener('resize', fit)

			viewport.removeEventListener('scroll', fit)

			setEdges(node, 0, 0)

			if (backdropRef.current) setEdges(backdropRef.current, 0, 0)
		}
	}, [node, backdropRef, active])
}

/** Sets the `top` and `bottom` of `element` in pixels, or clears each one that is zero. @internal */
function setEdges(element: HTMLElement, top: number, bottom: number) {
	element.style.top = top === 0 ? '' : `${top}px`

	element.style.bottom = bottom === 0 ? '' : `${bottom}px`
}
