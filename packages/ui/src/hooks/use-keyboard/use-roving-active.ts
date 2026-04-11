'use client'

import type React from 'react'
import { useCallback, useRef } from 'react'
import { nextIndexForKey, queryItems, type RovingConfig } from './navigation'

const ACTIVE_ATTR = 'data-active'

export type UseRovingActiveOptions = RovingConfig & {
	/**
	 * CSS selector for the items inside the list container.
	 */
	itemSelector: string
	/**
	 * Scroll the active item into view after each change.
	 * @default true
	 */
	scrollIntoView?: boolean
	/**
	 * Key that invokes `click()` on the currently active item. Pass `null` to
	 * disable activation entirely.
	 * @default 'Enter'
	 */
	activationKey?: string | null
}

/**
 * Virtual-focus roving navigation.
 *
 * Unlike {@link useRovingFocus}, this hook never moves DOM focus. Instead it
 * tracks the active item via a `data-active` attribute, so the handler can
 * stay attached to a separate input (e.g. a command palette search field)
 * while the visible list stays highlighted. Pressing the activation key
 * clicks the active item.
 */
export function useRovingActive<L extends HTMLElement = HTMLElement>({
	itemSelector,
	cols,
	orientation,
	scrollIntoView = true,
	activationKey = 'Enter',
}: UseRovingActiveOptions) {
	const listRef = useRef<L>(null)

	const onKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			const items = queryItems(listRef.current, itemSelector)

			if (!items.length) return

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

			if (scrollIntoView) items[nextIndex]?.scrollIntoView({ block: 'nearest' })
		},
		[itemSelector, cols, orientation, activationKey, scrollIntoView],
	)

	return { listRef, onKeyDown }
}
