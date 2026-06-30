'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useScrollWithin } from '../../hooks'

/**
 * Keeps a scroll container pinned to its newest content.
 *
 * @remarks
 * Attach `ref` to a sentinel element at the end of the transcript. Whenever
 * `dependency` changes — pass the message list (or its length) — the sentinel is
 * scrolled to the bottom of its own scroll container on the next animation
 * frame, after the appended content has laid out. Streaming replies that mutate
 * the last message advance the scroll as each chunk arrives. The scroll is
 * scoped to the nearest overflowing ancestor (via {@link useScrollWithin}), so
 * an outer page or layout container is never dragged out of view.
 * `scrollToBottom` is exposed for imperative scrolls (e.g. after an attachment
 * renders).
 *
 * @typeParam T - The watched dependency's type; identity changes drive the scroll.
 * @param dependency - Value whose change triggers an auto-scroll.
 * @returns `{ ref, scrollToBottom }`.
 */
export function useChatScroll<T>(dependency?: T) {
	const ref = useRef<HTMLDivElement>(null)

	const scrollWithin = useScrollWithin()

	const scrollToBottom = useCallback(() => {
		requestAnimationFrame(() => {
			scrollWithin(ref.current, { block: 'end', behavior: 'smooth' })
		})
	}, [scrollWithin])

	// biome-ignore lint/correctness/useExhaustiveDependencies: the watched `dependency` is the whole point — its identity change is what re-runs the scroll.
	useEffect(() => {
		scrollToBottom()
	}, [dependency, scrollToBottom])

	return { ref, scrollToBottom }
}
