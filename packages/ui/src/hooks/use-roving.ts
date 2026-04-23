'use client'

import { type KeyboardEvent, type RefObject, useCallback } from 'react'
import { useScrollWithin } from './use-scroll-within'

const ACTIVE_ATTR = 'data-active'

export type Orientation = 'horizontal' | 'vertical'

export type RovingConfig = {
	/** Column count for 2D grid navigation. Omit for single-axis mode. */
	cols?: number
	/** Axis for 1D navigation. Ignored when `cols` is set. */
	orientation?: Orientation
}

/** All elements matching `selector` inside `container`. */
export function queryItems<T extends HTMLElement = HTMLElement>(
	container: HTMLElement | null,
	selector: string,
): T[] {
	if (!container) return []

	return Array.from(container.querySelectorAll<T>(selector))
}

/**
 * Next roving index for a key press, or null if unhandled.
 * -1 means nothing is active; a forward key lands on the first item, back on the last.
 * Indices wrap at both ends.
 */
export function nextIndexForKey(
	key: string,
	currentIndex: number,
	itemCount: number,
	config: RovingConfig = {},
): number | null {
	if (itemCount === 0) return null

	if (key === 'Home') return 0

	if (key === 'End') return itemCount - 1

	return config.cols === undefined
		? nextIndexLinear(key, currentIndex, itemCount, config.orientation ?? 'vertical')
		: nextIndexGrid(key, currentIndex, itemCount, config.cols)
}

/** Wraps `index` into `[0, count)`. */
function wrap(index: number, count: number): number {
	return ((index % count) + count) % count
}

function nextIndexLinear(
	key: string,
	currentIndex: number,
	itemCount: number,
	orientation: Orientation,
): number | null {
	const delta =
		key === (orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight')
			? 1
			: key === (orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft')
				? -1
				: null

	if (delta === null) return null

	if (currentIndex === -1) return delta === 1 ? 0 : itemCount - 1

	return wrap(currentIndex + delta, itemCount)
}

function nextIndexGrid(
	key: string,
	currentIndex: number,
	itemCount: number,
	cols: number,
): number | null {
	if (currentIndex === -1) {
		if (key === 'ArrowRight' || key === 'ArrowDown') return 0

		if (key === 'ArrowLeft' || key === 'ArrowUp') return itemCount - 1

		return null
	}

	switch (key) {
		case 'ArrowRight':
			return wrap(currentIndex + 1, itemCount)
		case 'ArrowLeft':
			return wrap(currentIndex - 1, itemCount)
		case 'ArrowDown':
			return currentIndex + cols < itemCount ? currentIndex + cols : currentIndex % cols
		case 'ArrowUp':
			return currentIndex - cols >= 0
				? currentIndex - cols
				: itemCount - cols + (currentIndex % cols)
		default:
			return null
	}
}

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
	const scrollWithin = useScrollWithin()

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

			if (scrollIntoView) {
				const item = items[nextIndex]

				if (item) scrollWithin(item, { block: 'nearest' })
			}
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
			scrollWithin,
		],
	)
}
