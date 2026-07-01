'use client'

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useScrollWithin } from '../../hooks'

/**
 * Keeps a scroll container pinned to its newest content.
 *
 * @remarks
 * Attach `ref` to a sentinel element at the end of the transcript. On mount —
 * including a remount a parent triggers with a new `key` when it switches to a
 * different chat — the sentinel jumps to the bottom of its own scroll container
 * before the browser paints, so the transcript never flashes its top. After
 * that, whenever `dependency` changes — pass the message list (or its length)
 * — the sentinel smooth-scrolls to the bottom on the next animation frame,
 * after the appended content has laid out, so streamed chunks stay in view.
 * The scroll is scoped to the nearest overflowing ancestor (via
 * {@link useScrollWithin}), so an outer page or layout container is never
 * dragged out of view. `scrollToBottom` is exposed for imperative scrolls
 * (e.g. after an attachment renders).
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

	// Runs before paint so the initial position is the bottom, not a glide toward it.
	useLayoutEffect(() => {
		scrollWithin(ref.current, { block: 'end', behavior: 'auto' })
	}, [scrollWithin])

	const mounted = useRef(false)

	// biome-ignore lint/correctness/useExhaustiveDependencies: the watched `dependency` is the whole point — its identity change is what re-runs the scroll.
	useEffect(() => {
		// The mount-time jump above already lands on the bottom; skip the redundant smooth scroll.
		if (!mounted.current) {
			mounted.current = true

			return
		}

		scrollToBottom()
	}, [dependency, scrollToBottom])

	return { ref, scrollToBottom }
}
