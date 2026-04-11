'use client'

import { type KeyboardEvent, type RefObject, useCallback } from 'react'
import { nextIndexForKey, queryItems, type RovingConfig } from './navigation'

export type UseRovingFocusOptions = RovingConfig & {
	/**
	 * CSS selector for the focusable items inside the container. Results are
	 * queried lazily on each keystroke, so callers don't have to memoize.
	 */
	itemSelector: string
	/**
	 * When no item inside the container currently has focus, should a
	 * navigation key still focus the first/last item? Enable this when the
	 * keydown handler is attached to an element outside the list itself
	 * (e.g. a combobox input delegating to its popover). Disable — the
	 * default — to keep the handler strictly a roving-focus helper.
	 */
	focusOnEmpty?: boolean
}

/**
 * Roving-focus navigation for arrow keys, Home, and End.
 *
 * Moves DOM focus between items matching `itemSelector` inside `containerRef`.
 * Supports 1D (`orientation`) and 2D (`cols`) layouts, wraps at both ends, and
 * skips items that can't receive focus (disabled buttons, elements outside the
 * tab order).
 */
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
