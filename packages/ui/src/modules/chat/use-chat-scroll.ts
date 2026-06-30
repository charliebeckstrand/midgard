'use client'

import { useCallback, useEffect, useRef } from 'react'

/**
 * Keeps a scroll container pinned to its newest content.
 *
 * @remarks
 * Attach `ref` to a sentinel element at the end of the transcript. Whenever
 * `dependency` changes — pass the message list (or its length) — the sentinel is
 * scrolled into view on the next animation frame, after the appended content has
 * laid out. Streaming replies that mutate the last message advance the scroll as
 * each chunk arrives. `scrollToBottom` is exposed for imperative scrolls (e.g.
 * after an attachment renders).
 *
 * @typeParam T - The watched dependency's type; identity changes drive the scroll.
 * @param dependency - Value whose change triggers an auto-scroll.
 * @returns `{ ref, scrollToBottom }`.
 */
export function useChatScroll<T>(dependency?: T) {
	const ref = useRef<HTMLDivElement>(null)

	const scrollToBottom = useCallback(() => {
		requestAnimationFrame(() => {
			ref.current?.scrollIntoView({ behavior: 'smooth' })
		})
	}, [])

	// biome-ignore lint/correctness/useExhaustiveDependencies: the watched `dependency` is the whole point — its identity change is what re-runs the scroll.
	useEffect(() => {
		scrollToBottom()
	}, [dependency, scrollToBottom])

	return { ref, scrollToBottom }
}
