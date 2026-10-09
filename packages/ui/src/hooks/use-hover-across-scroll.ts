'use client'

import { useEffect, useEffectEvent, useRef } from 'react'

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
 * `pointerleave`. A scroll fires neither. The browser recomputes the element
 * under a still pointer once the scroll settles, and a synthetically dispatched
 * move does not reach React's delegated handlers. Replaying the pointer is
 * therefore no substitute. This instead hides the readout the moment a scroll
 * begins. A beat after it settles, it recomputes hover directly at the pointer's
 * unchanged viewport position through `resolveAt`. That is the caller's own hit
 * math, with no event in play. So the readout is gone while the surface moves and returns the instant
 * it rests, showing whatever now sits under the pointer.
 *
 * A touch pan is the exception: the finger is no longer down when the scroll
 * settles, so the readout stays cleared and is not resolved again.
 *
 * @remarks Both callbacks are raised through effect events, so each scroll
 * frame reaches the latest render's closure and neither identity re-subscribes
 * the scroll listener mid-gesture.
 *
 * @param enabled - Whether the readout feature is on. Pass a stable flag (the
 * tooltip prop), not the transient hover. A scroll's own clear then never tears
 * the listeners down mid-gesture. While it is false, no listener runs.
 * @param clear - Hides the readout; called on each scroll frame. Make it bail
 * when already clear so a page scroll far from this plot costs no render.
 * @param resolveAt - Recomputes hover at a viewport point once the scroll
 * settles: sets the mark under it, or clears when the point rests off the marks.
 */
export function useHoverAcrossScroll(
	enabled: boolean,
	clear: () => void,
	resolveAt: (clientX: number, clientY: number) => void,
): void {
	const pointer = useRef<{ x: number; y: number } | null>(null)

	const touch = useRef(false)

	const clearReadout = useEffectEvent(clear)

	const resolveHover = useEffectEvent(resolveAt)

	useEffect(() => {
		if (!enabled) return

		// The pointer's last viewport position: a scroll fires no `pointermove`, so
		// this is where the pointer still sits when it does. It is tracked only while
		// the readout is on, so a scroll before the first move resolves nothing.
		const onMove = (event: PointerEvent) => {
			pointer.current = { x: event.clientX, y: event.clientY }

			touch.current = event.pointerType === 'touch'
		}

		let settle: ReturnType<typeof setTimeout> | undefined

		const onScroll = () => {
			// Hide while the surface moves; the pointer can now rest anywhere on it.
			clearReadout()

			clearTimeout(settle)

			settle = setTimeout(() => {
				const p = pointer.current

				// A finger that panned the surface has lifted: nothing rests under it.
				if (p !== null && !touch.current) resolveHover(p.x, p.y)
			}, SETTLE_MS)
		}

		window.addEventListener('pointermove', onMove, { capture: true, passive: true })

		window.addEventListener('scroll', onScroll, { capture: true, passive: true })

		return () => {
			window.removeEventListener('pointermove', onMove, { capture: true })

			window.removeEventListener('scroll', onScroll, { capture: true })

			clearTimeout(settle)

			// A later turn-on must not resolve at a pointer that this effect no longer tracks.
			pointer.current = null
		}
	}, [enabled])
}
