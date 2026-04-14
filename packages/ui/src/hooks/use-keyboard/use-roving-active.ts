'use client'

import type React from 'react'
import { useCallback, useRef } from 'react'
import { nextIndexForKey, queryItems, type RovingConfig } from './navigation'

const ACTIVE_ATTR = 'data-active'

export type UseRovingActiveOptions = RovingConfig & {
	/** CSS selector for navigable items inside the list container. */
	itemSelector: string
	/** Scroll the active item into view after each move. */
	scrollIntoView?: boolean
	/** Key that clicks the active item. Pass null to disable. */
	activationKey?: string | null
}

/**
 * Virtual-focus roving navigation. Tracks the active item via `data-active`
 * without moving DOM focus, so the handler can live on a separate input
 * while the list stays visually highlighted.
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

			if (scrollIntoView) items[nextIndex]?.scrollIntoView({ block: 'center' })
		},
		[itemSelector, cols, orientation, activationKey, scrollIntoView],
	)

	return { listRef, onKeyDown }
}
