'use client'

import type { Virtualizer } from '@tanstack/react-virtual'
import { type ReactNode, useCallback, useEffect, useRef } from 'react'
import { type ChatScrollContextValue, ChatScrollProvider } from './context'

// ── Types ──────────────────────────────────────────────

export type ChatScrollProps = {
	children: ReactNode
	/** Called when the user scrolls near the top — use to load older items. */
	onTopReached?: () => void
	/** Called when the user scrolls near the bottom. */
	onBottomReached?: () => void
	/** Distance in pixels from the edge to trigger top/bottom callbacks. @default 100 */
	threshold?: number
	/** When true and the user is pinned to the bottom, auto-scrolls on new items. @default true */
	stickToBottom?: boolean
}

// ── Component ──────────────────────────────────────────

export function ChatScroll({
	children,
	onTopReached,
	onBottomReached,
	threshold = 100,
	stickToBottom = true,
}: ChatScrollProps) {
	const containerRef = useRef<HTMLDivElement | null>(null)
	const virtualizerRef = useRef<Virtualizer<HTMLDivElement, Element> | null>(null)
	const isPinnedRef = useRef(true)
	const prevCountRef = useRef(0)
	const topReachedRef = useRef(false)
	const bottomReachedRef = useRef(false)

	// Called by VirtualList when it mounts, giving us access to its internals.
	const register = useCallback(
		(container: HTMLDivElement, virtualizer: Virtualizer<HTMLDivElement, Element>) => {
			containerRef.current = container
			virtualizerRef.current = virtualizer
		},
		[],
	)

	// Listen to scroll events on the registered container.
	useEffect(() => {
		const el = containerRef.current
		if (!el) return

		function handleScroll() {
			if (!el) return

			const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
			const distanceFromTop = el.scrollTop

			isPinnedRef.current = distanceFromBottom < threshold

			// Fire onTopReached when scrolled near the top (debounced per scroll direction).
			if (distanceFromTop < threshold) {
				if (!topReachedRef.current) {
					topReachedRef.current = true
					onTopReached?.()
				}
			} else {
				topReachedRef.current = false
			}

			// Fire onBottomReached when scrolled near the bottom (debounced per scroll direction).
			if (distanceFromBottom < threshold) {
				if (!bottomReachedRef.current) {
					bottomReachedRef.current = true
					onBottomReached?.()
				}
			} else {
				bottomReachedRef.current = false
			}
		}

		el.addEventListener('scroll', handleScroll, { passive: true })
		return () => el.removeEventListener('scroll', handleScroll)
	}, [onTopReached, onBottomReached, threshold])

	// Auto-scroll to bottom when items are appended and user is pinned.
	useEffect(() => {
		const virtualizer = virtualizerRef.current
		if (!virtualizer) return

		const count = virtualizer.options.count
		const prevCount = prevCountRef.current
		prevCountRef.current = count

		if (prevCount === 0) return
		if (count <= prevCount) return

		if (isPinnedRef.current && stickToBottom) {
			virtualizer.scrollToIndex(count - 1, { align: 'end' })
		}
	})

	const contextValue: ChatScrollContextValue = {
		register,
		initialAnchor: 'end',
	}

	return <ChatScrollProvider value={contextValue}>{children}</ChatScrollProvider>
}
