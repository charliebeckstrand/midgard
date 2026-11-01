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

		// The edges of the last write. A write that changes nothing is skipped.
		let edges = { top: 0, bottom: 0 }

		// Sets the edges of the box, and moves the backdrop out past the box by
		// the same amounts.
		const apply = (top: number, bottom: number) => {
			if (top === edges.top && bottom === edges.bottom) return

			edges = { top, bottom }

			setEdges(node, top, bottom)

			if (backdropRef.current) setEdges(backdropRef.current, -top, -bottom)
		}

		const fit = () => {
			// A pinch zoom moves no edge of the box.
			if (Math.abs(viewport.scale - 1) > 0.01) return apply(0, 0)

			const { offsetTop, height } = viewport

			apply(Math.max(0, offsetTop), Math.max(0, window.innerHeight - offsetTop - height))
		}

		fit()

		const listeners = new AbortController()

		viewport.addEventListener('resize', fit, { signal: listeners.signal })

		viewport.addEventListener('scroll', fit, { signal: listeners.signal })

		return () => {
			listeners.abort()

			apply(0, 0)
		}
	}, [node, backdropRef, active])
}

/** Sets the `top` and `bottom` of `element` in pixels, or clears each one that is zero. @internal */
function setEdges(element: HTMLElement, top: number, bottom: number) {
	element.style.top = top === 0 ? '' : `${top}px`

	element.style.bottom = bottom === 0 ? '' : `${bottom}px`
}
