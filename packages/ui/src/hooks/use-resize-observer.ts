'use client'

import { type RefObject, useEffect, useEffectEvent } from 'react'

/**
 * Observes size changes on `ref.current` and invokes `callback` on each
 * change, plus once synchronously when the effect first attaches.
 *
 * @remarks
 * `callback` is raised through an effect event, so it always sees the latest
 * render's values and its identity never re-subscribes the observer. Passing a
 * fresh closure each render is safe; the subscription tracks `ref` alone.
 */
export function useResizeObserver(ref: RefObject<Element | null>, callback: () => void): void {
	const onResize = useEffectEvent(callback)

	useEffect(() => {
		const el = ref.current

		if (!el) return

		onResize()

		const observer = new ResizeObserver(onResize)

		observer.observe(el)

		return () => observer.disconnect()
	}, [ref])
}
