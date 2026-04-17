'use client'

import { type KeyboardEvent, type RefObject, useCallback } from 'react'
import { nextIndexForKey, queryItems, type RovingConfig } from './navigation'

const ACTIVE_ATTR = 'data-active'

export type UseRovingOptions = RovingConfig & {
	/** CSS selector for navigable items inside the container. */
	itemSelector: string
	/**
	 * `focus` moves real DOM focus to the active item; `virtual` marks it with
	 * `data-active` so a separate input can retain focus.
	 * @default 'focus'
	 */
	mode?: 'focus' | 'virtual'
	/** Focus mode: move to the first / last item even when nothing in the container has focus. */
	focusOnEmpty?: boolean
	/** Virtual mode: scroll the active item into view after each move. @default true */
	scrollIntoView?: boolean
	/** Virtual mode: key that clicks the active item. Pass null to disable. @default 'Enter' */
	activationKey?: string | null
}

/** Arrow / Home / End navigation over items inside `containerRef`. Wraps at both ends. */
export function useRoving<T extends HTMLElement = HTMLElement>(
	containerRef: RefObject<HTMLElement | null>,
	{
		itemSelector,
		cols,
		orientation,
		mode = 'focus',
		focusOnEmpty = false,
		scrollIntoView = true,
		activationKey = 'Enter',
	}: UseRovingOptions,
) {
	return useCallback(
		(e: KeyboardEvent) => {
			const items = queryItems<T>(containerRef.current, itemSelector)

			if (!items.length) return

			if (mode === 'focus') {
				const currentIndex = items.indexOf(document.activeElement as T)

				if (currentIndex === -1 && !focusOnEmpty) return

				const nextIndex = nextIndexForKey(e.key, currentIndex, items.length, { cols, orientation })

				if (nextIndex === null) return

				e.preventDefault()

				items[nextIndex]?.focus()

				return
			}

			const currentIndex = items.findIndex((el) => el.dataset.active !== undefined)

			if (activationKey && e.key === activationKey) {
				if (currentIndex === -1) return

				e.preventDefault()

				items[currentIndex]?.click()

				return
			}

			const nextIndex = nextIndexForKey(e.key, currentIndex, items.length, { cols, orientation })

			if (nextIndex === null) return

			e.preventDefault()

			for (const [i, el] of items.entries()) {
				if (i === nextIndex) el.setAttribute(ACTIVE_ATTR, '')
				else el.removeAttribute(ACTIVE_ATTR)
			}

			if (scrollIntoView) items[nextIndex]?.scrollIntoView({ block: 'center' })
		},
		[
			containerRef,
			itemSelector,
			mode,
			cols,
			orientation,
			focusOnEmpty,
			scrollIntoView,
			activationKey,
		],
	)
}
