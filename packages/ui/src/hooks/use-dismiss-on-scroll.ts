'use client'

import { useEffect, useRef } from 'react'

/**
 * Clears a pointer readout the instant any ancestor scrolls while it is open.
 *
 * A readout driven by pointer-move handlers — a chart or map tooltip — clears
 * only on `pointerleave`, and the browser withholds that event through a
 * scroll: it recomputes the element under a stationary pointer once, after the
 * scroll settles, so the readout lingers over empty space for the scroll's
 * duration. Scroll never bubbles, but it propagates in the capture phase, so a
 * capturing `window` listener catches it from every scrollable ancestor and
 * dismisses the readout the moment the surface moves.
 *
 * @param active - Whether a readout is showing; the listener attaches only then.
 * @param onScroll - Clears the readout. Read through a ref, so an unstable
 * identity never re-subscribes the listener as the pointer churns the state.
 * @internal
 */
export function useDismissOnScroll(active: boolean, onScroll: () => void): void {
	const onScrollRef = useRef(onScroll)

	onScrollRef.current = onScroll

	useEffect(() => {
		if (!active) return

		const handler = () => onScrollRef.current()

		window.addEventListener('scroll', handler, { capture: true, passive: true })

		return () => window.removeEventListener('scroll', handler, { capture: true })
	}, [active])
}
