'use client'

import { type KeyboardEvent, type RefObject, useCallback, useEffect } from 'react'
import {
	crossAxisDelta,
	type NavigationConfig,
	nextIndexForKey,
} from '../../utilities/keyboard-navigation'
import { useScrollWithin } from '../use-scroll-within'
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

/** Pins every row action at `tabIndex=-1`; they never hold the resting stop, but cross-axis arrows reach them. @internal */
function pinRowActions(container: HTMLElement, actionSelector: string): void {
	for (const action of queryItems(container, actionSelector)) {
		if (action.tabIndex !== -1) action.tabIndex = -1
	}
}

/**
 * Resolves which item holds the focus-mode resting stop: the focused item if
 * any, else the single existing stop (the user has roved), else the
 * `activeSelector` match, else the first item.
 *
 * @internal
 */
function resolveRestingStop(
	items: HTMLElement[],
	activeSelector: string | undefined,
): HTMLElement | undefined {
	const focused = items.find((it) => it === document.activeElement)

	if (focused) return focused

	const tabbable = items.filter((it) => it.tabIndex === 0)

	if (tabbable.length === 1) return tabbable[0]

	const bySelector = activeSelector ? items.find((it) => it.matches(activeSelector)) : undefined

	return bySelector ?? items[0]
}

type ScrollWithin = ReturnType<typeof useScrollWithin>

/**
 * Per-keystroke dependencies for the move handlers, resolved once in the
 * callback so each helper keeps a flat signature.
 */
type RovingKeyContext = {
	items: HTMLElement[]
	isVirtual: boolean
	manageTabIndex: boolean
	activeDescendantRef: RefObject<HTMLElement | null> | undefined
	manageAriaSelected: boolean
	scrollIntoView: boolean
	scrollWithin: ScrollWithin
}

/** Inputs to {@link processRowContext} for resolving row cross-axis navigation. */
type RowContextOptions = {
	items: HTMLElement[]
	itemSelector: string
	actionSelector: string | undefined
	rowSelector: string | undefined
	orientation: NavigationConfig['orientation']
	cols: NavigationConfig['cols']
	isVirtual: boolean
}

/**
 * Moves to `items[index]`: real focus in focus mode, the virtual marker (plus
 * optional scroll) in virtual mode.
 *
 * @internal
 */
function moveTo(index: number, ctx: RovingKeyContext): void {
	if (!ctx.isVirtual) {
		const next = ctx.items[index]

		if (!next) return

		// Carry the resting stop to the newly focused item; leaving and
		// re-Tabbing into the widget returns to this item.
		if (ctx.manageTabIndex) seatTabStop(ctx.items, next)

		next.focus()

		return
	}

	setVirtualActive(ctx.items, index, ctx.activeDescendantRef, {
		ariaSelected: ctx.manageAriaSelected,
	})

	if (ctx.scrollIntoView) {
		const next = ctx.items[index]

		if (next) ctx.scrollWithin(next, { block: 'nearest' })
	}
}

/**
 * Routes a keypress when focus sits on a row's action control: cross-axis
 * arrows move through the row's own controls; main-axis moves anchor to the
 * row's item so Up / Down reach the adjacent row.
 *
 * @returns `handled` plus the (possibly anchored) current index for the
 * main-axis fallthrough.
 * @internal
 */
function processRowContext(
	event: KeyboardEvent,
	container: HTMLElement | null,
	active: HTMLElement | null,
	currentIndex: number,
	opts: RowContextOptions,
): { handled: boolean; currentIndex: number } {
	const { items, itemSelector, actionSelector, rowSelector, orientation, cols, isVirtual } = opts

	const rowEl =
		!isVirtual && rowSelector && actionSelector && cols === undefined
			? active?.closest<HTMLElement>(rowSelector)
			: undefined

	if (!rowEl || !container?.contains(rowEl)) return { handled: false, currentIndex }

	const index = currentIndex === -1 ? items.findIndex((it) => rowEl.contains(it)) : currentIndex

	const crossDelta = crossAxisDelta(event.key, orientation ?? 'vertical')

	if (crossDelta === null || !actionSelector) return { handled: false, currentIndex: index }

	const controls = rowControls(rowEl, itemSelector, actionSelector)

	const controlIndex = controls.indexOf(active as HTMLElement)

	if (controlIndex === -1) return { handled: false, currentIndex: index }

	event.preventDefault()

	// Clamped at the row edges, unlike the wrapping main axis.
	controls[controlIndex + crossDelta]?.focus()

	return { handled: true, currentIndex: index }
}

/**
 * Virtual mode: the activation key clicks the active item.
 *
 * @returns True once the key belongs to activation so the caller stops.
 * @internal
 */
function handleActivationKey(
	event: KeyboardEvent,
	ctx: RovingKeyContext,
	currentIndex: number,
	activationKey: string | null,
): boolean {
	if (!ctx.isVirtual || !activationKey || event.key !== activationKey) return false

	if (currentIndex === -1) return true

	event.preventDefault()

	ctx.items[currentIndex]?.click()

	return true
}

/**
 * Type-ahead jump; runs ahead of the focus-empty guard so a letter can enter
 * the list even when nothing is active yet.
 *
 * @returns True once the key is a type-ahead key.
 * @internal
 */
function handleTypeahead(
	event: KeyboardEvent,
	ctx: RovingKeyContext,
	currentIndex: number,
	matchTypeahead: ReturnType<typeof useTypeahead>,
	typeahead: boolean,
): boolean {
	if (!typeahead || !isTypeaheadKey(event)) return false

	const index = matchTypeahead(ctx.items, event.key, currentIndex)

	if (index !== null) {
		event.preventDefault()

		moveTo(index, ctx)
	}

	return true
}

/** Main-axis arrow / Home / End navigation, after the focus-empty guard. @internal */
function handleMainAxisNav(
	event: KeyboardEvent,
	currentIndex: number,
	ctx: RovingKeyContext,
	opts: {
		cols: NavigationConfig['cols']
		orientation: NavigationConfig['orientation']
		focusOnEmpty: boolean
	},
): void {
	if (!ctx.isVirtual && currentIndex === -1 && !opts.focusOnEmpty) return

	const nextIndex = nextIndexForKey(event.key, currentIndex, ctx.items.length, {
		cols: opts.cols,
		orientation: opts.orientation,
	})

	if (nextIndex === null) return

	event.preventDefault()

	moveTo(nextIndex, ctx)
}

type RovingOptions = NavigationConfig & {
	/** CSS selector for navigable items inside the container. */
	itemSelector: string
	/**
	 * `focus` moves real DOM focus to the active item; `virtual` marks it with
	 * `data-active` while a separate input retains focus.
	 * @defaultValue 'focus'
	 */
	mode?: 'focus' | 'virtual'
	/** Focus mode: move to the first / last item even when nothing in the container has focus. */
	focusOnEmpty?: boolean
	/**
	 * Jump to the item whose label starts with recently typed characters
	 * (WAI-ARIA type-ahead). Off by default; enable for menus and listboxes,
	 * not for text inputs that own their own typing. Reads the label from each
	 * item's `aria-label`, falling back to its trimmed `textContent`.
	 * @defaultValue false
	 */
	typeahead?: boolean
	/** Virtual mode: scroll the active item into view after each move. @defaultValue true */
	scrollIntoView?: boolean
	/**
	 * Virtual mode: mirror the highlight onto each item's `aria-selected`. Leave
	 * on when the highlight *is* the selection (command palette); turn off when
	 * the items own `aria-selected` for a stored value (combobox), where moving
	 * the highlight only repoints `aria-activedescendant`.
	 * @defaultValue true
	 */
	manageAriaSelected?: boolean
	/** Virtual mode: key that clicks the active item. Pass null to disable. @defaultValue 'Enter' */
	activationKey?: string | null
	/**
	 * Focus mode: own the roving `tabIndex` so the widget is a single Tab stop.
	 * Seats `tabIndex=0` on the resting item (see `activeSelector`, else the first
	 * item) and `-1` on the rest, keeps that invariant as the subtree mutates, and
	 * moves the `0` with focus on each arrow press. Leave off for widgets whose
	 * items already drive their own `tabIndex` (e.g. `Tab`'s `tabIndex={current?0:-1}`)
	 * or that must stay individually Tab-focusable (plain site-nav links).
	 * @defaultValue false
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
 *
 * @returns A stable `onKeyDown` handler to attach to the container; it reads
 * items from `containerRef` on each press, so the item set may change between
 * presses. The `tabIndex` ownership (focus mode + `manageTabIndex`) and the
 * `aria-activedescendant` mirroring run as effects, independent of the handler.
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

			if (actionSelector) pinRowActions(el, actionSelector)

			if (!items.length) return

			seatTabStop(items, resolveRestingStop(items, activeSelector))
		}

		normalize()

		// Carry the resting stop to any item that takes focus by click or script;
		// arrow roving already seats it in `moveTo`. `focusin` bubbles where `focus`
		// doesn't; one container listener covers every item.
		const onFocusIn = (event: FocusEvent) => {
			const items = queryItems(el, itemSelector)

			const target = items.find((it) => it === event.target)

			if (target) {
				seatTabStop(items, target)

				return
			}

			// Focus moving elsewhere inside a row (to an affix action) keeps the
			// resting stop on the row's item: Tab re-enters on an item, never an
			// action.
			if (rowSelector && event.target instanceof HTMLElement) {
				const rowEl = event.target.closest(rowSelector)

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
		(event: KeyboardEvent) => {
			const items = queryItems(containerRef.current, itemSelector)

			if (!items.length) return

			const isVirtual = mode === 'virtual'

			const active = document.activeElement as HTMLElement | null

			const currentIndex = isVirtual
				? items.findIndex((el) => el.dataset.active !== undefined)
				: items.indexOf(active as HTMLElement)

			const ctx: RovingKeyContext = {
				items,
				isVirtual,
				manageTabIndex,
				activeDescendantRef,
				manageAriaSelected,
				scrollIntoView,
				scrollWithin,
			}

			const rowResult = processRowContext(event, containerRef.current, active, currentIndex, {
				items,
				itemSelector,
				actionSelector,
				rowSelector,
				orientation,
				cols,
				isVirtual,
			})

			if (rowResult.handled) return

			if (handleActivationKey(event, ctx, rowResult.currentIndex, activationKey)) return

			if (handleTypeahead(event, ctx, rowResult.currentIndex, matchTypeahead, typeahead)) return

			handleMainAxisNav(event, rowResult.currentIndex, ctx, { cols, orientation, focusOnEmpty })
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
