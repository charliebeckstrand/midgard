'use client'

import { type KeyboardEvent, useCallback, useEffect, useRef } from 'react'
import { accessibleName } from '../../core'

/** Idle window after which the type-ahead buffer resets. */
const TYPEAHEAD_TIMEOUT_MS = 500

/** Whether a key event should drive type-ahead: a lone printable character. @internal */
export function isTypeaheadKey(event: KeyboardEvent): boolean {
	return (
		event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey
	)
}

/** Label that matches an item during type-ahead: its accessible name, lowercased. @internal */
function itemLabel(el: HTMLElement): string {
	return accessibleName(el).toLowerCase()
}

/** Mutable buffer backing one type-ahead instance. @internal */
export type TypeaheadState = { query: string; timer: number }

/**
 * Extends the type-ahead buffer with `key` and walks `count` candidates from
 * `labelAt`, skipping any `isDisabled` index, to find the next match. Shared
 * by the DOM matcher ({@link matchTypeahead}) and the index-based matcher
 * ({@link matchTypeaheadIndexed}); see {@link matchTypeahead} for the buffer
 * semantics.
 *
 * @internal
 */
function matchTypeaheadCore(
	state: TypeaheadState,
	count: number,
	labelAt: (index: number) => string,
	isDisabled: ((index: number) => boolean) | undefined,
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

	for (let offset = 0; offset < count; offset++) {
		const index = (start + offset) % count

		if (isDisabled?.(index)) continue

		if (labelAt(index).startsWith(query)) return index
	}

	return null
}

/**
 * Extend the type-ahead buffer with `key` and return the index of the next
 * matching item, or null. Repeated presses of the same character cycle through
 * items that start with it (search resumes past `currentIndex`); distinct
 * characters build a prefix matched from `currentIndex` onward. The buffer
 * self-clears after a 500 ms idle window.
 *
 * @internal
 */
export function matchTypeahead(
	state: TypeaheadState,
	items: HTMLElement[],
	key: string,
	currentIndex: number,
): number | null {
	return matchTypeaheadCore(
		state,
		items.length,
		(index) => {
			const item = items[index]

			return item ? itemLabel(item) : ''
		},
		undefined,
		key,
		currentIndex,
	)
}

/**
 * Index-based counterpart to {@link matchTypeahead}: matches against
 * `getTextValue(index)` over a `count`-sized data source instead of DOM
 * elements, so type-ahead reaches items outside a virtualized window.
 * Skips indices `isDisabled` marks.
 *
 * @internal
 */
export function matchTypeaheadIndexed(
	state: TypeaheadState,
	count: number,
	getTextValue: (index: number) => string,
	isDisabled: ((index: number) => boolean) | undefined,
	key: string,
	currentIndex: number,
): number | null {
	return matchTypeaheadCore(
		state,
		count,
		(index) => getTextValue(index).toLowerCase(),
		isDisabled,
		key,
		currentIndex,
	)
}

/**
 * WAI-ARIA type-ahead (jump to the item whose label starts with recently typed
 * characters). Owns one instance's buffer and its idle-reset timer, cleared on
 * unmount; returns a stable matcher with `matchTypeahead` semantics. Labels
 * come from each item's accessible name (`aria-label`, an `aria-labelledby`
 * target, else trimmed `textContent`).
 *
 * @internal
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

/**
 * Index-based counterpart to {@link useTypeahead}: owns its own buffer and
 * returns a stable matcher with {@link matchTypeaheadIndexed} semantics, for
 * roving over a virtual item source instead of DOM elements.
 *
 * @internal
 */
export function useTypeaheadIndexed() {
	const stateRef = useRef<TypeaheadState>({ query: '', timer: 0 })

	useEffect(
		() => () => {
			if (typeof window !== 'undefined') window.clearTimeout(stateRef.current.timer)
		},
		[],
	)

	return useCallback(
		(
			count: number,
			getTextValue: (index: number) => string,
			isDisabled: ((index: number) => boolean) | undefined,
			key: string,
			currentIndex: number,
		) =>
			matchTypeaheadIndexed(stateRef.current, count, getTextValue, isDisabled, key, currentIndex),
		[],
	)
}
