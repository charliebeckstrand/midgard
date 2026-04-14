'use client'

import { type KeyboardEvent, type RefObject, useCallback } from 'react'
import { nextIndexForKey, queryItems, type RovingConfig } from './navigation'

export type UseRovingFocusOptions = RovingConfig & {
	/** CSS selector for focusable items. Queried lazily on each keystroke. */
	itemSelector: string
	/** Focus the first / last item even when nothing in the container has focus. */
	focusOnEmpty?: boolean
}

/** Roving-focus navigation for arrow keys, Home, and End. Wraps at both ends. */
export function useRovingFocus<T extends HTMLElement = HTMLElement>(
	containerRef: RefObject<HTMLElement | null>,
	{ itemSelector, cols, orientation, focusOnEmpty = false }: UseRovingFocusOptions,
) {
	return useCallback(
		(e: KeyboardEvent) => {
			const items = queryItems<T>(containerRef.current, itemSelector)

			if (!items.length) return

			const currentIndex = items.indexOf(document.activeElement as T)

			if (currentIndex === -1 && !focusOnEmpty) return

			const nextIndex = nextIndexForKey(e.key, currentIndex, items.length, { cols, orientation })

			if (nextIndex === null) return

			e.preventDefault()

			items[nextIndex]?.focus()
		},
		[containerRef, itemSelector, cols, orientation, focusOnEmpty],
	)
}
