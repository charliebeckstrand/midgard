'use client'

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

/**
 * Scrolls one element to its own bottom. `scrollTop` rather than `scrollTo` for
 * the instant case, because it is the one form every environment implements and
 * both clamp to the maximum offset on their own.
 *
 * @internal
 */
function toBottom(element: HTMLElement, behavior: ScrollBehavior) {
	if (behavior === 'smooth' && typeof element.scrollTo === 'function') {
		element.scrollTo({ top: element.scrollHeight, behavior })

		return
	}

	element.scrollTop = element.scrollHeight
}

/**
 * Keeps a chat's scroll container pinned to its newest content.
 *
 * @remarks
 * Attach `containerRef` to the scrolling element itself — the one carrying
 * `overflow-y-auto`. On mount, including a remount a parent triggers with a new
 * `key` when it switches to a different chat, it jumps to the bottom before the
 * browser paints, so the transcript never flashes its top. After that, whenever
 * `dependency` changes — pass the message list (or its length) — it
 * smooth-scrolls to the bottom on the next animation frame, once the appended
 * content has laid out, so streamed chunks stay in view. `scrollToBottom` is
 * exposed for imperative scrolls (e.g. after an attachment renders).
 *
 * The container is named rather than searched, which is what keeps the scroll
 * inside it. An earlier form took a ref to a sentinel at the end of the
 * transcript and asked {@link useScrollWithin} to walk up to the sentinel's
 * nearest overflowing ancestor — rediscovering at runtime the element its own
 * caller had rendered. A transcript short enough not to overflow is not that
 * ancestor, so the walk passed through it and scrolled whatever container
 * outside it did overflow: the page moved, and whether it moved depended on how
 * much had been said. Scrolling the named element cannot reach past it, and
 * costs no `getComputedStyle` walk per streamed chunk.
 *
 * An element that is not a scroll container absorbs this harmlessly — its
 * `scrollHeight` is its `clientHeight`, so the write is a no-op rather than a
 * scroll somewhere else.
 *
 * @typeParam T - The watched dependency's type; identity changes drive the scroll.
 * @param dependency - Value whose change triggers an auto-scroll.
 * @returns `{ containerRef, scrollToBottom }`.
 */
export function useChatScroll<T>(dependency?: T) {
	const containerRef = useRef<HTMLDivElement>(null)

	const scrollToBottom = useCallback(() => {
		// Deferred a frame so the appended content has laid out and `scrollHeight`
		// reads its new value.
		requestAnimationFrame(() => {
			if (containerRef.current) toBottom(containerRef.current, 'smooth')
		})
	}, [])

	// Runs before paint so the initial position is the bottom, not a glide toward it.
	useLayoutEffect(() => {
		if (containerRef.current) toBottom(containerRef.current, 'auto')
	}, [])

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

	return { containerRef, scrollToBottom }
}
