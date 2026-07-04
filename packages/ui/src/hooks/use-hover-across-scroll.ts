'use client'

import { useEffect, useRef } from 'react'

/**
 * Milliseconds of scroll quiet that count as a settle; the readout re-resolves
 * only after the surface has held still this long. Long enough to outlast
 * momentum's between-frame gaps, short enough to feel immediate on release.
 * @internal
 */
const SETTLE_MS = 120

/**
 * Keeps a pointer-driven readout — a chart or map tooltip — honest across a
 * scroll, which slides the plot under a stationary pointer.
 *
 * The readout is raised by pointer-move handlers over the marks and cleared on
 * `pointerleave`. A scroll fires neither: the browser recomputes the element
 * under a still pointer once the scroll settles, and a synthetically dispatched
 * move does not reach React's delegated handlers, so replaying the pointer is no
 * substitute. This instead hides the readout the moment a scroll begins and, a
 * beat after it settles, recomputes hover directly at the pointer's unchanged
 * viewport position through `resolveAt` — the caller's own hit math, no event in
 * play. So the readout is gone while the surface moves and returns the instant
 * it rests, showing whatever now sits under the pointer.
 *
 * @param enabled - Whether the readout feature is on; pass a stable flag (the
 * tooltip prop), not the transient hover, so a scroll's own clear never tears
 * the listener down mid-gesture.
 * @param clear - Hides the readout; called on each scroll frame. Make it bail
 * when already clear so a page scroll far from this plot costs no render.
 * @param resolveAt - Recomputes hover at a viewport point once the scroll
 * settles: sets the mark under it, or clears when the point rests off the marks.
 * @internal
 */
export function useHoverAcrossScroll(
	enabled: boolean,
	clear: () => void,
	resolveAt: (clientX: number, clientY: number) => void,
): void {
	const pointer = useRef<{ x: number; y: number } | null>(null)

	const clearRef = useRef(clear)

	clearRef.current = clear

	const resolveRef = useRef(resolveAt)

	resolveRef.current = resolveAt

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
		if (!enabled) return

		let settle: ReturnType<typeof setTimeout> | undefined

		const onScroll = () => {
			// Hide while the surface moves; the pointer may now rest anywhere on it.
			clearRef.current()

			clearTimeout(settle)

			settle = setTimeout(() => {
				const p = pointer.current

				if (p !== null) resolveRef.current(p.x, p.y)
			}, SETTLE_MS)
		}

		window.addEventListener('scroll', onScroll, { capture: true, passive: true })

		return () => {
			window.removeEventListener('scroll', onScroll, { capture: true })

			clearTimeout(settle)
		}
	}, [enabled])
}
