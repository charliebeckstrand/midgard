'use client'

import { type KeyboardEvent, type RefObject, useCallback } from 'react'
import type { Orientation } from '../types'
import { useScrollWithin } from './use-scroll-within'

type RovingConfig = {
	/** Column count for 2D grid navigation. Omit for single-axis mode. */
	cols?: number
	/** Axis for 1D navigation. Ignored when `cols` is set. */
	orientation?: Orientation
}

/** All elements matching `selector` inside `container`. */
export function queryItems(container: HTMLElement | null, selector: string): HTMLElement[] {
	if (!container) return []

	return Array.from(container.querySelectorAll<HTMLElement>(selector))
}

/**
 * Move the virtual-mode active marker to `items[index]`: shifts `data-active`,
 * and — when `activeDescendantRef` is given — mirrors `aria-selected` onto the
 * items and `aria-activedescendant` onto the owner. Pass a negative `index`
 * (or an empty list) to clear the active state. The previously active item is
 * found by its `data-active` marker, so callers don't track an index.
 */
export function setVirtualActive(
	items: HTMLElement[],
	index: number,
	activeDescendantRef?: RefObject<HTMLElement | null>,
): void {
	const prev = items.find((el) => el.dataset.active !== undefined)

	const next = index >= 0 ? items[index] : undefined

	prev?.removeAttribute('data-active')

	next?.setAttribute('data-active', '')

	if (activeDescendantRef) {
		prev?.setAttribute('aria-selected', 'false')

		next?.setAttribute('aria-selected', 'true')

		const controller = activeDescendantRef.current

		if (next?.id) controller?.setAttribute('aria-activedescendant', next.id)
		else controller?.removeAttribute('aria-activedescendant')
	}
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
		case 'ArrowUp': {
			if (currentIndex - cols >= 0) return currentIndex - cols

			// Wrap to the bottommost item in the same column. Columns past the
			// last row's fill land one row up.
			const col = currentIndex % cols

			const lastRowFill = itemCount % cols || cols

			const bottomRowStart = itemCount - lastRowFill

			return col < lastRowFill ? bottomRowStart + col : bottomRowStart - cols + col
		}
		default:
			return null
	}
}

type UseRovingOptions = RovingConfig & {
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
	/**
	 * Virtual mode: a `combobox`/`textbox` element that owns the listbox. When
	 * provided, the active item is mirrored into ARIA — `aria-selected` is set on
	 * it (and cleared from the previous one) and the element's
	 * `aria-activedescendant` is pointed at the active item's `id` — so assistive
	 * tech can track the keyboard highlight while focus stays on the input.
	 */
	activeDescendantRef?: RefObject<HTMLElement | null>
}

/** Arrow / Home / End navigation over items inside `containerRef`. Wraps at both ends. */
export function useRoving(
	containerRef: RefObject<HTMLElement | null>,
	{
		itemSelector,
		cols,
		orientation,
		mode = 'focus',
		focusOnEmpty = false,
		scrollIntoView = true,
		activationKey = 'Enter',
		activeDescendantRef,
	}: UseRovingOptions,
) {
	const scrollWithin = useScrollWithin()

	return useCallback(
		(e: KeyboardEvent) => {
			const items = queryItems(containerRef.current, itemSelector)

			if (!items.length) return

			const isVirtual = mode === 'virtual'

			const currentIndex = isVirtual
				? items.findIndex((el) => el.dataset.active !== undefined)
				: items.indexOf(document.activeElement as HTMLElement)

			if (!isVirtual && currentIndex === -1 && !focusOnEmpty) return

			if (isVirtual && activationKey && e.key === activationKey) {
				if (currentIndex === -1) return

				e.preventDefault()

				items[currentIndex]?.click()

				return
			}

			const nextIndex = nextIndexForKey(e.key, currentIndex, items.length, { cols, orientation })

			if (nextIndex === null) return

			e.preventDefault()

			if (!isVirtual) {
				items[nextIndex]?.focus()

				return
			}

			setVirtualActive(items, nextIndex, activeDescendantRef)

			if (scrollIntoView) {
				const next = items[nextIndex]

				if (next) scrollWithin(next, { block: 'nearest' })
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
			activeDescendantRef,
			scrollWithin,
		],
	)
}
