'use client'

import { type RefObject, useEffect } from 'react'

/**
 * Observes size changes on `ref.current` and invokes `callback` on each
 * change, plus once synchronously when the effect first attaches.
 *
 * The effect's dependency array captures `callback`. Pass a stable
 * reference (e.g. `useCallback`) and read mutable values through a ref
 * inside the callback; a fresh reference re-subscribes the observer each
 * render and re-fires its initial callback.
 *
 * @param enabled - Observe only while `true`. Pass `false` when the size is
 * fixed by other means so no observer is constructed and no resize ever
 * reaches the callback; toggling it re-subscribes. @defaultValue true
 */
export function useResizeObserver(
	ref: RefObject<Element | null>,
	callback: () => void,
	enabled = true,
): void {
	useEffect(() => {
		const el = ref.current

		if (!el || !enabled) return

		callback()

		const observer = new ResizeObserver(callback)

		observer.observe(el)

		return () => observer.disconnect()
	}, [ref, callback, enabled])
}
