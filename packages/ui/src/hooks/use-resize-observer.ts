'use client'

import { type RefObject, useEffect } from 'react'

/**
 * Observes size changes on `ref.current` and invokes `callback` on each
 * change, plus once synchronously when the effect first attaches.
 *
 * `callback` is captured in the effect's dependency array. Pass a stable
 * reference (e.g. `useCallback`) and read mutable values through a ref
 * inside the callback; a fresh reference re-subscribes the observer each
 * render and re-fires its initial callback.
 */
export function useResizeObserver(ref: RefObject<Element | null>, callback: () => void): void {
	useEffect(() => {
		const el = ref.current

		if (!el) return

		callback()

		const observer = new ResizeObserver(callback)

		observer.observe(el)

		return () => observer.disconnect()
	}, [ref, callback])
}
