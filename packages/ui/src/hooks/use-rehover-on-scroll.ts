'use client'

import { type RefObject, useEffect, useRef } from 'react'

/**
 * Keeps a pointer-driven readout — a chart or map tooltip — honest across a
 * scroll, which moves the plot under a stationary pointer.
 *
 * The readout is raised by pointer-move handlers over the marks and cleared on
 * `pointerleave`. A scroll fires neither: the browser recomputes the element
 * under a still pointer once, after the scroll settles, so a naive listener
 * that merely cleared on scroll would drop the readout and never bring it back
 * while the pointer still rests on a mark. This instead re-fires the pointer at
 * its last viewport position on every scroll frame — the position it still
 * occupies — so each module's own hit handlers re-resolve: the readout clears
 * first, then a mark now under the pointer re-opens it with fresh contents, and
 * the gap between marks leaves it closed. The pointer never left; only the
 * surface moved, so replaying the move where it sits is what a scroll owed.
 *
 * @param active - Whether a readout is showing; the scroll listener runs only then.
 * @param clear - Drops the current readout.
 * @param plotRef - The plot region; a re-fire is confined to marks within it, so
 * a scroll never reaches a sibling plot's hit layer.
 * @internal
 */
export function useRehoverOnScroll(
	active: boolean,
	clear: () => void,
	plotRef: RefObject<HTMLElement | null>,
): void {
	const pointer = useRef<{ x: number; y: number } | null>(null)

	const clearRef = useRef(clear)

	clearRef.current = clear

	// The pointer's last viewport position, tracked for the whole mount: a scroll
	// fires no `pointermove`, so this is where the pointer still sits when it does.
	useEffect(() => {
		const onMove = (event: PointerEvent) => {
			pointer.current = { x: event.clientX, y: event.clientY }
		}

		window.addEventListener('pointermove', onMove, { capture: true, passive: true })

		return () => window.removeEventListener('pointermove', onMove, { capture: true })
	}, [])

	useEffect(() => {
		if (!active) return

		const onScroll = () => {
			const p = pointer.current

			// Drop the stale readout first; a re-fire below re-opens it only if a
			// mark still sits under the pointer, so a scroll off the marks stays clear.
			clearRef.current()

			const plot = plotRef.current

			if (p === null || plot === null) return

			const under = document.elementFromPoint(p.x, p.y)

			// Confine the replay to this plot's own marks: a bubbling move dispatched
			// into a sibling chart would raise *its* tooltip on a scroll nobody hovered.
			if (under !== null && plot.contains(under))
				under.dispatchEvent(
					new PointerEvent('pointermove', { bubbles: true, clientX: p.x, clientY: p.y }),
				)
		}

		window.addEventListener('scroll', onScroll, { capture: true, passive: true })

		return () => window.removeEventListener('scroll', onScroll, { capture: true })
	}, [active, plotRef])
}
