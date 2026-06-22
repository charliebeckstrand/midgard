'use client'

import { useCallback, useRef } from 'react'

/**
 * Provides a sentinel `ref` and a `scrollToBottom` that smooth-scrolls it into view.
 *
 * @internal
 * @remarks
 * Attach `ref` to an end-of-list element. The scroll is deferred to the next
 * animation frame so it runs after the appended content has laid out.
 * @returns `{ ref, scrollToBottom }`.
 */
export function useScrollToBottom() {
	const ref = useRef<HTMLDivElement>(null)

	const scrollToBottom = useCallback(() => {
		requestAnimationFrame(() => {
			ref.current?.scrollIntoView({ behavior: 'smooth' })
		})
	}, [])

	return { ref, scrollToBottom }
}
