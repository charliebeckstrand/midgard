'use client'

import { type KeyboardEvent, type RefObject, useCallback, useEffect, useRef } from 'react'
import type { Orientation } from '../../types'
import { useScrollWithin } from '../use-scroll-within'

/** Idle window after which the type-ahead buffer resets. */
const TYPEAHEAD_TIMEOUT_MS = 500

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
 * and — when `activeDescendantRef` is given — points `aria-activedescendant` on
 * the owner at the active item. By default it also mirrors `aria-selected` onto
 * the items so the highlight doubles as selection (the right model when there is
 * no persistent choice, e.g. a command palette); pass `ariaSelected: false` when
 * the items already carry their own `aria-selected` for a stored value (e.g. a
 * combobox), so the highlight stays a pure focus cue and doesn't clobber it.
 * Pass a negative `index` (or an empty list) to clear the active state. The
 * previously active item is found by its `data-active` marker, so callers don't
 * track an index.
 */
export function setVirtualActive(
	items: HTMLElement[],
	index: number,
	activeDescendantRef?: RefObject<HTMLElement | null>,
	{ ariaSelected = true }: { ariaSelected?: boolean } = {},
): void {
	const prev = items.find((el) => el.dataset.active !== undefined)

	const next = index >= 0 ? items[index] : undefined

	prev?.removeAttribute('data-active')

	next?.setAttribute('data-active', '')

	if (activeDescendantRef) {
		if (ariaSelected) {
			prev?.setAttribute('aria-selected', 'false')

			next?.setAttribute('aria-selected', 'true')
		}

		const controller = activeDescendantRef.current

		if (next?.id) controller?.setAttribute('aria-activedescendant', next.id)
		else controller?.removeAttribute('aria-activedescendant')
	}
}

/**
 * Seat the single focus-mode Tab stop: `active` takes `tabIndex=0` and every
 * other item `-1`. Writes only on divergence so a MutationObserver watching
 * `tabindex` doesn't feed back on these edits. Pass `undefined` to demote all.
 */
export function seatTabStop(items: HTMLElement[], active: HTMLElement | undefined): void {
	for (const it of items) {
		const desired = it === active ? 0 : -1

		if (it.tabIndex !== desired) it.tabIndex = desired
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

/** Whether a key event should drive type-ahead — a lone printable character. */
function isTypeaheadKey(e: KeyboardEvent): boolean {
	return e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey
}

/** Label used to match an item during type-ahead: `aria-label`, else text. */
function itemLabel(el: HTMLElement): string {
	return (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().toLowerCase()
}

/** Mutable buffer backing one roving instance's type-ahead. */
export type TypeaheadState = { query: string; timer: number }

/**
 * Extend the type-ahead buffer with `key` and return the index of the next
 * matching item, or null. Repeated presses of the same character cycle through
 * items that start with it (search resumes past `currentIndex`); distinct
 * characters build a prefix matched from `currentIndex` onward. The buffer
 * self-clears after a short idle window.
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

type RovingOptions = RovingConfig & {
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
	/**
	 * Jump to the item whose label starts with recently typed characters
	 * (WAI-ARIA type-ahead). Off by default; enable for menus and listboxes,
	 * not for text inputs that own their own typing. The label is read from each
	 * item's `aria-label`, falling back to its trimmed `textContent`.
	 * @default false
	 */
	typeahead?: boolean
	/** Virtual mode: scroll the active item into view after each move. @default true */
	scrollIntoView?: boolean
	/**
	 * Virtual mode: mirror the highlight onto each item's `aria-selected`. Leave
	 * on when the highlight *is* the selection (command palette); turn off when
	 * the items own `aria-selected` for a stored value (combobox), so moving the
	 * highlight only repoints `aria-activedescendant`.
	 * @default true
	 */
	manageAriaSelected?: boolean
	/** Virtual mode: key that clicks the active item. Pass null to disable. @default 'Enter' */
	activationKey?: string | null
	/**
	 * Focus mode: own the roving `tabIndex` so the widget is a single Tab stop.
	 * Seats `tabIndex=0` on the resting item (see `activeSelector`, else the first
	 * item) and `-1` on the rest, keeps that invariant as the subtree mutates, and
	 * moves the `0` with focus on each arrow press. Leave off for widgets whose
	 * items already drive their own `tabIndex` (e.g. `Tab`'s `tabIndex={current?0:-1}`)
	 * or that must stay individually Tab-focusable (plain site-nav links).
	 * @default false
	 */
	manageTabIndex?: boolean
	/**
	 * Focus mode + `manageTabIndex`: selector for the item that holds the resting
	 * `tabIndex=0` on mount (e.g. `[aria-current="page"]`). Falls back to the first
	 * item when it matches nothing, and is ignored once the user has roved.
	 */
	activeSelector?: string
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
export function useA11yRoving(
	containerRef: RefObject<HTMLElement | null>,
	{
		itemSelector,
		cols,
		orientation,
		mode = 'focus',
		focusOnEmpty = false,
		typeahead = false,
		scrollIntoView = true,
		activationKey = 'Enter',
		activeDescendantRef,
		manageAriaSelected = true,
		manageTabIndex = false,
		activeSelector,
	}: RovingOptions,
) {
	const scrollWithin = useScrollWithin()

	const typeaheadRef = useRef<TypeaheadState>({ query: '', timer: 0 })

	// `matchTypeahead` schedules a 500 ms buffer-reset timer; clear it on unmount
	// so a list torn down mid-window doesn't leave a timer firing on a dead state.
	useEffect(
		() => () => {
			if (typeof window !== 'undefined') window.clearTimeout(typeaheadRef.current.timer)
		},
		[],
	)

	// Focus-mode single-tab-stop ownership. Seats exactly one matched item at
	// `tabIndex=0` and demotes the rest to `-1`, re-running as the subtree mutates
	// (items added/removed, disabled toggled, current item moved) and carrying the
	// stop to any item that takes focus. Writes only on divergence so the observer
	// doesn't feed back on its own tabindex edits.
	useEffect(() => {
		if (mode !== 'focus' || !manageTabIndex) return

		const el = containerRef.current

		if (!el) return

		const normalize = () => {
			const items = queryItems(el, itemSelector)

			if (!items.length) return

			// The control that holds focus is, by definition, the resting stop. A
			// native control that just mounted or became enabled arrives at
			// `tabIndex=0`, so the count below can't tell it apart from the deliberate
			// stop — anchoring to the focused item keeps a freshly-enabled sibling
			// (e.g. a re-enabled zoom button in a toolbar) from stealing the stop out
			// from under the user mid-interaction.
			const focused = items.find((it) => it === document.activeElement)

			const tabbable = items.filter((it) => it.tabIndex === 0)

			// A single existing stop means the user has already roved — preserve it.
			// Otherwise (fresh mount, where every native control is tabbable) seat the
			// stop on the active item, falling back to the first.
			const active =
				focused ??
				(tabbable.length === 1
					? tabbable[0]
					: ((activeSelector ? items.find((it) => it.matches(activeSelector)) : undefined) ??
						items[0]))

			seatTabStop(items, active)
		}

		normalize()

		// Carry the resting stop to whatever item takes focus — a click or
		// programmatic focus, not just arrow roving (`moveTo` seats those itself).
		// `focusin` bubbles where `focus` doesn't, so one container listener catches
		// focus landing on any item; the stop then survives Tab away and back.
		const onFocusIn = (e: FocusEvent) => {
			const items = queryItems(el, itemSelector)

			const target = items.find((it) => it === e.target)

			if (target) seatTabStop(items, target)
		}

		el.addEventListener('focusin', onFocusIn)

		const observer = new MutationObserver(normalize)

		observer.observe(el, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['tabindex', 'disabled', 'aria-current'],
		})

		return () => {
			el.removeEventListener('focusin', onFocusIn)

			observer.disconnect()
		}
	}, [containerRef, itemSelector, mode, manageTabIndex, activeSelector])

	return useCallback(
		(e: KeyboardEvent) => {
			const items = queryItems(containerRef.current, itemSelector)

			if (!items.length) return

			const isVirtual = mode === 'virtual'

			const currentIndex = isVirtual
				? items.findIndex((el) => el.dataset.active !== undefined)
				: items.indexOf(document.activeElement as HTMLElement)

			const moveTo = (index: number) => {
				if (!isVirtual) {
					const next = items[index]

					if (!next) return

					// Carry the resting stop to the newly focused item so leaving and
					// re-Tabbing into the widget returns here. `focusin` would seat it
					// once `focus()` lands, but doing it first keeps the arrow path
					// synchronous and independent of the event firing.
					if (manageTabIndex) seatTabStop(items, next)

					next.focus()

					return
				}

				setVirtualActive(items, index, activeDescendantRef, { ariaSelected: manageAriaSelected })

				if (scrollIntoView) {
					const next = items[index]

					if (next) scrollWithin(next, { block: 'nearest' })
				}
			}

			if (isVirtual && activationKey && e.key === activationKey) {
				if (currentIndex === -1) return

				e.preventDefault()

				items[currentIndex]?.click()

				return
			}

			// Type-ahead runs ahead of the focus-empty nav guard so a letter can
			// jump into the list even when nothing is active yet.
			if (typeahead && isTypeaheadKey(e)) {
				const index = matchTypeahead(typeaheadRef.current, items, e.key, currentIndex)

				if (index !== null) {
					e.preventDefault()

					moveTo(index)
				}

				return
			}

			if (!isVirtual && currentIndex === -1 && !focusOnEmpty) return

			const nextIndex = nextIndexForKey(e.key, currentIndex, items.length, { cols, orientation })

			if (nextIndex === null) return

			e.preventDefault()

			moveTo(nextIndex)
		},
		[
			containerRef,
			itemSelector,
			mode,
			cols,
			orientation,
			focusOnEmpty,
			typeahead,
			scrollIntoView,
			activationKey,
			activeDescendantRef,
			scrollWithin,
			manageAriaSelected,
			manageTabIndex,
		],
	)
}
