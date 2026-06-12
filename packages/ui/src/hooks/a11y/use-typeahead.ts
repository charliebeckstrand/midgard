'use client'

import { type KeyboardEvent, useCallback, useEffect, useRef } from 'react'

/** Idle window after which the type-ahead buffer resets. */
const TYPEAHEAD_TIMEOUT_MS = 500

/** Whether a key event should drive type-ahead: a lone printable character. */
export function isTypeaheadKey(e: KeyboardEvent): boolean {
	return e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey
}

/** Label that matches an item during type-ahead: `aria-label`, else text. */
function itemLabel(el: HTMLElement): string {
	return (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().toLowerCase()
}

/** Mutable buffer backing one type-ahead instance. */
export type TypeaheadState = { query: string; timer: number }

/**
 * Extend the type-ahead buffer with `key` and return the index of the next
 * matching item, or null. Repeated presses of the same character cycle through
 * items that start with it (search resumes past `currentIndex`); distinct
 * characters build a prefix matched from `currentIndex` onward. The buffer
 * self-clears after a 500 ms idle window.
 */
export function matchTypeahead(
	state: TypeaheadState,
	items: HTMLElement[],
	key: string,
	currentIndex: number,
): number | null {
	if (typeof window !== 'undefined') {
		window.clearTimeout(state.timer)

		state.timer = window.setTimeout(() => {
			state.query = ''
		}, TYPEAHEAD_TIMEOUT_MS)
	}

	state.query += key.toLowerCase()

	const repeated = [...state.query].every((char) => char === state.query[0])

	const query = repeated ? state.query.slice(0, 1) : state.query

	const start = repeated ? currentIndex + 1 : Math.max(currentIndex, 0)

	for (let offset = 0; offset < items.length; offset++) {
		const index = (start + offset) % items.length

		const item = items[index]

		if (item && itemLabel(item).startsWith(query)) return index
	}

	return null
}

/**
 * WAI-ARIA type-ahead (jump to the item whose label starts with recently typed
 * characters). Owns one instance's buffer and its idle-reset timer, cleared on
 * unmount; returns a stable matcher with `matchTypeahead` semantics. Labels
 * come from each item's `aria-label`, falling back to trimmed `textContent`.
 */
export function useTypeahead() {
	const stateRef = useRef<TypeaheadState>({ query: '', timer: 0 })

	// `matchTypeahead` schedules a 500 ms buffer-reset timer; clear it on unmount.
	useEffect(
		() => () => {
			if (typeof window !== 'undefined') window.clearTimeout(stateRef.current.timer)
		},
		[],
	)

	return useCallback(
		(items: HTMLElement[], key: string, currentIndex: number) =>
			matchTypeahead(stateRef.current, items, key, currentIndex),
		[],
	)
}
