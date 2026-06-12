'use client'

import { type KeyboardEvent, type RefObject, useCallback, useEffect } from 'react'
import { useScrollWithin } from '../use-scroll-within'
import { crossAxisDelta, type NavigationConfig, nextIndexForKey } from './keyboard-navigation'
import { isTypeaheadKey, useTypeahead } from './use-typeahead'

type RovingRowConfig = {
	/** Selector for the wrapper grouping an item with its action controls. */
	rowSelector: string
	/** Selector for the action controls themselves; disjoint from `itemSelector`. */
	actionSelector: string
}

/** Visible, enabled controls of a row in DOM order: its item plus its actions. */
function rowControls(
	rowEl: HTMLElement,
	itemSelector: string,
	actionSelector: string,
): HTMLElement[] {
	return (
		queryItems(rowEl, `${itemSelector}, ${actionSelector}`)
			.filter((el) => !el.matches(':disabled') && (el.checkVisibility?.() ?? true))
			// Spec orders selector-list matches by document position, but jsdom
			// (nwsapi) groups them by selector; sort so arrow order is the DOM order.
			.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
	)
}

/** All elements matching `selector` inside `container`. */
export function queryItems(container: HTMLElement | null, selector: string): HTMLElement[] {
	if (!container) return []

	return Array.from(container.querySelectorAll<HTMLElement>(selector))
}

/**
 * Move the virtual-mode active marker to `items[index]`: shifts `data-active`
 * and, when `activeDescendantRef` is given, points `aria-activedescendant` on
 * the owner at the active item. By default it also mirrors `aria-selected`
 * onto the items (highlight doubles as selection, the command palette model);
 * pass `ariaSelected: false` when items carry their own `aria-selected` for a
 * stored value (e.g. a combobox), keeping the highlight a pure focus cue.
 * Pass a negative `index` (or an empty list) to clear the active state. The
 * `data-active` marker identifies the prior active item; callers don't track
 * an index.
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
 * other item `-1`. Writes only on divergence; a MutationObserver watches
 * `tabindex` and fires on every edit. Pass `undefined` to demote all.
 */
function seatTabStop(items: HTMLElement[], active: HTMLElement | undefined): void {
	for (const it of items) {
		const desired = it === active ? 0 : -1

		if (it.tabIndex !== desired) it.tabIndex = desired
	}
}

type RovingOptions = NavigationConfig & {
	/** CSS selector for navigable items inside the container. */
	itemSelector: string
	/**
	 * `focus` moves real DOM focus to the active item; `virtual` marks it with
	 * `data-active` while a separate input retains focus.
	 * @default 'focus'
	 */
	mode?: 'focus' | 'virtual'
	/** Focus mode: move to the first / last item even when nothing in the container has focus. */
	focusOnEmpty?: boolean
	/**
	 * Jump to the item whose label starts with recently typed characters
	 * (WAI-ARIA type-ahead). Off by default; enable for menus and listboxes,
	 * not for text inputs that own their own typing. Reads the label from each
	 * item's `aria-label`, falling back to its trimmed `textContent`.
	 * @default false
	 */
	typeahead?: boolean
	/** Virtual mode: scroll the active item into view after each move. @default true */
	scrollIntoView?: boolean
	/**
	 * Virtual mode: mirror the highlight onto each item's `aria-selected`. Leave
	 * on when the highlight *is* the selection (command palette); turn off when
	 * the items own `aria-selected` for a stored value (combobox), where moving
	 * the highlight only repoints `aria-activedescendant`.
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
	 * `tabIndex=0` on mount (e.g. `[aria-current="page"]`). Falls back to the
	 * first item when it matches nothing; applies only until the user roves.
	 */
	activeSelector?: string
	/**
	 * Virtual mode: a `combobox`/`textbox` element that owns the listbox. When
	 * provided, the hook mirrors the active item into ARIA: it sets
	 * `aria-selected` on the item (clearing the previous one) and points the
	 * element's `aria-activedescendant` at the active item's `id` while focus
	 * stays on the input.
	 */
	activeDescendantRef?: RefObject<HTMLElement | null>
	/**
	 * Focus mode: cross-axis roving into per-item action controls (e.g. a
	 * sidebar item's prefix/suffix buttons). `rowSelector` matches the wrapper
	 * grouping an item with its actions; `actionSelector` matches the action
	 * controls. The cross arrows (Left/Right under a vertical `orientation`)
	 * move through the focused row's visible controls in DOM order, clamped at
	 * the row edges. Main-axis arrows from an action anchor at the row's item,
	 * so Up/Down reach the adjacent row. With `manageTabIndex`, the hook pins
	 * actions at `tabIndex=-1` so the widget stays a single Tab stop that
	 * always re-enters on an item. Ignored when `cols` is set.
	 */
	row?: RovingRowConfig
}

/**
 * Arrow / Home / End navigation over items inside `containerRef`. Wraps at
 * both ends; with `row`, the cross arrows rove into per-row action controls.
 * Composes `nextIndexForKey` (key → index math) and `useTypeahead` with the
 * DOM choreography: focus or virtual active-state moves, single-Tab-stop
 * `tabIndex` ownership, and row cross-axis roving.
 */
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
		row,
	}: RovingOptions,
) {
	const scrollWithin = useScrollWithin()

	// Depend on the selector strings, not the `row` object: callers pass inline
	// literals whose identity changes per render.
	const rowSelector = row?.rowSelector

	const actionSelector = row?.actionSelector

	const matchTypeahead = useTypeahead()

	// Focus-mode single-tab-stop ownership. Seats exactly one matched item at
	// `tabIndex=0` and demotes the rest to `-1`, re-running as the subtree mutates
	// (items added/removed, disabled toggled, current item moved) and carrying the
	// stop to whatever item takes focus. Writes only on divergence; the observer
	// fires on its own tabindex edits.
	useEffect(() => {
		if (mode !== 'focus' || !manageTabIndex) return

		const el = containerRef.current

		if (!el) return

		const normalize = () => {
			const items = queryItems(el, itemSelector)

			// Row actions never hold the resting stop; cross-axis arrows reach them.
			if (actionSelector) {
				for (const action of queryItems(el, actionSelector)) {
					if (action.tabIndex !== -1) action.tabIndex = -1
				}
			}

			if (!items.length) return

			// The focused item is the resting stop, matched ahead of the count below:
			// a freshly mounted or re-enabled native control arrives at `tabIndex=0`,
			// indistinguishable by count from the deliberate stop.
			const focused = items.find((it) => it === document.activeElement)

			const tabbable = items.filter((it) => it.tabIndex === 0)

			// A single existing stop means the user has already roved; preserve it.
			// Otherwise, seat the stop on the active item (per `activeSelector`),
			// falling back to the first.
			const active =
				focused ??
				(tabbable.length === 1
					? tabbable[0]
					: ((activeSelector ? items.find((it) => it.matches(activeSelector)) : undefined) ??
						items[0]))

			seatTabStop(items, active)
		}

		normalize()

		// Carry the resting stop to any item that takes focus by click or script;
		// arrow roving already seats it in `moveTo`. `focusin` bubbles where `focus`
		// doesn't; one container listener covers every item.
		const onFocusIn = (e: FocusEvent) => {
			const items = queryItems(el, itemSelector)

			const target = items.find((it) => it === e.target)

			if (target) {
				seatTabStop(items, target)

				return
			}

			// Focus moving elsewhere inside a row (to an affix action) keeps the
			// resting stop on the row's item: Tab re-enters on an item, never an
			// action.
			if (rowSelector && e.target instanceof HTMLElement) {
				const rowEl = e.target.closest(rowSelector)

				const anchor = rowEl ? items.find((it) => rowEl.contains(it)) : undefined

				if (anchor) seatTabStop(items, anchor)
			}
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
	}, [
		containerRef,
		itemSelector,
		mode,
		manageTabIndex,
		activeSelector,
		rowSelector,
		actionSelector,
	])

	return useCallback(
		(e: KeyboardEvent) => {
			const items = queryItems(containerRef.current, itemSelector)

			if (!items.length) return

			const isVirtual = mode === 'virtual'

			const active = document.activeElement as HTMLElement | null

			let currentIndex = isVirtual
				? items.findIndex((el) => el.dataset.active !== undefined)
				: items.indexOf(active as HTMLElement)

			// Focus sitting on a row's action control: cross-axis arrows move
			// through the row's own controls, and main-axis moves anchor to the
			// row's item so Up/Down reach the adjacent row.
			const rowEl =
				!isVirtual && rowSelector && actionSelector && cols === undefined
					? active?.closest<HTMLElement>(rowSelector)
					: undefined

			if (rowEl && containerRef.current?.contains(rowEl)) {
				if (currentIndex === -1) {
					currentIndex = items.findIndex((it) => rowEl.contains(it))
				}

				const crossDelta = crossAxisDelta(e.key, orientation ?? 'vertical')

				if (crossDelta !== null && actionSelector) {
					const controls = rowControls(rowEl, itemSelector, actionSelector)

					const index = controls.indexOf(active as HTMLElement)

					if (index !== -1) {
						e.preventDefault()

						// Clamped at the row edges, unlike the wrapping main axis.
						controls[index + crossDelta]?.focus()

						return
					}
				}
			}

			const moveTo = (index: number) => {
				if (!isVirtual) {
					const next = items[index]

					if (!next) return

					// Carry the resting stop to the newly focused item; leaving and
					// re-Tabbing into the widget returns to this item.
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

			// Type-ahead runs ahead of the focus-empty nav guard; a letter can
			// jump into the list even when nothing is active yet.
			if (typeahead && isTypeaheadKey(e)) {
				const index = matchTypeahead(items, e.key, currentIndex)

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
			rowSelector,
			actionSelector,
			matchTypeahead,
		],
	)
}
