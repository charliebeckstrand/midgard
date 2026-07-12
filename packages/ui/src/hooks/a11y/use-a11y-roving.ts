'use client'

import { type KeyboardEvent, type RefObject, useCallback, useEffect } from 'react'
import {
	crossAxisDelta,
	type NavigationConfig,
	nextIndexForKey,
} from '../../utilities/keyboard-navigation'
import { useScrollWithin } from '../use-scroll-within'
import { isTypeaheadKey, useTypeahead, useTypeaheadIndexed } from './use-typeahead'

/**
 * Pluggable index-based item source for virtual (windowed) roving: lets
 * {@link useA11yRoving} navigate a list by index instead of querying the DOM,
 * so arrow / type-ahead reach items outside a virtualized window (Home/End
 * likewise, for a container that routes them to roving rather than reserving
 * them, as `Combobox`/`CommandPalette` do for the textbox caret).
 * `VirtualOptions` constructs and registers one from its `items` plus the
 * `getOptionId` / `isDisabled` / `getTextValue` props.
 */
export type VirtualItemSource = {
	/** Total number of items in the full (unwindowed) list. */
	count: number
	/**
	 * Stable id for the item at `index` — must match the `id` the row renders
	 * with, so `aria-activedescendant` resolves once the row mounts.
	 */
	getKey: (index: number) => string
	/** Whether the item at `index` is disabled; navigation skips it. */
	isDisabled?: (index: number) => boolean
	/** Text value for type-ahead matching at `index`, in place of an element's accessible name. */
	getTextValue?: (index: number) => string
	/** Scrolls the item at `index` into the rendered window, mounting it if it was outside it. */
	scrollToIndex: (index: number, options?: { align?: 'auto' | 'center' | 'end' | 'start' }) => void
}

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
 * Clear the virtual-mode active marker: strips `data-active` / `aria-selected`
 * from the active row (when `items` are passed) and drops the owner's
 * `aria-activedescendant`. The named reset counterpart to {@link setVirtualActive},
 * so callers express intent as `clearVirtualActive(ref)` rather than the cryptic
 * `setVirtualActive([], -1, ref)`. A closing panel unmounts its rows, so the
 * owner-clear alone — no `items` — is the usual call.
 */
export function clearVirtualActive(
	activeDescendantRef: RefObject<HTMLElement | null>,
	items: HTMLElement[] = [],
	options?: { ariaSelected?: boolean },
): void {
	setVirtualActive(items, -1, activeDescendantRef, options)
}

/** The id `source` mints for `index`, or undefined out of range. @internal */
function resolveVirtualItemId(source: VirtualItemSource, index: number): string | undefined {
	return index >= 0 && index < source.count ? source.getKey(index) : undefined
}

/**
 * Syncs the DOM to the logical active id for an indexed source: clears a
 * stale `data-active` row, points the owner's `aria-activedescendant` at `id`
 * (even before the row mounts — a windowed-out row isn't in the DOM yet), and
 * marks `data-active`/`aria-selected` on it once it is. Idempotent, so it is
 * safe to call again once a row that wasn't mounted the first time appears.
 *
 * @returns True once `id`'s row is confirmed active in the DOM (already was,
 * or just applied); false when there's no id to apply, or its row isn't
 * mounted inside `container` yet — the signal callers use to decide whether
 * to keep watching for it.
 * @internal
 */
function applyVirtualActiveDom(
	container: HTMLElement | null,
	id: string | undefined,
	activeDescendantRef: RefObject<HTMLElement | null> | undefined,
	ariaSelected: boolean,
): boolean {
	const prev = container?.querySelector<HTMLElement>('[data-active]')

	if (prev && prev.id !== id) {
		prev.removeAttribute('data-active')

		if (ariaSelected) prev.setAttribute('aria-selected', 'false')
	}

	const controller = activeDescendantRef?.current

	if (id) controller?.setAttribute('aria-activedescendant', id)
	else controller?.removeAttribute('aria-activedescendant')

	if (!id) return false

	// `aria-activedescendant` ids are document-unique by spec; resolve through
	// the document, not a container query, and confirm it's actually inside
	// `container` before touching it.
	const next = document.getElementById(id)

	if (!next || !container?.contains(next)) return false

	if (next.dataset.active === undefined) {
		next.setAttribute('data-active', '')

		if (ariaSelected) next.setAttribute('aria-selected', 'true')
	}

	return true
}

/**
 * Watches `container` for `id`'s row to mount — a windowed target scrolled
 * into view via `scrollToIndex` doesn't mount synchronously, since the
 * virtualizer re-renders on its own schedule, decoupled from this call.
 * Scoped to this specific navigation via `index`: on each mutation, a stale
 * watcher (superseded by a newer move that already changed `activeIndexRef`)
 * disconnects instead of applying an outdated highlight.
 *
 * @internal
 */
function watchForIndexedMount(
	container: HTMLElement,
	id: string,
	index: number,
	activeIndexRef: RefObject<number>,
	activeDescendantRef: RefObject<HTMLElement | null> | undefined,
	ariaSelected: boolean,
): void {
	const observer = new MutationObserver(() => {
		if (activeIndexRef.current !== index) {
			observer.disconnect()

			return
		}

		if (applyVirtualActiveDom(container, id, activeDescendantRef, ariaSelected))
			observer.disconnect()
	})

	observer.observe(container, { childList: true, subtree: true })
}

/**
 * Indexed-source counterpart to {@link setVirtualActive}: records `index` on
 * `activeIndexRef` (the logical active index, since a windowed-out row has no
 * DOM `data-active` marker to read it back off of), scrolls it into the
 * window via the source's `scrollToIndex`, and applies the DOM highlight
 * immediately if the row is already mounted — else watches `container` until
 * it mounts. Pass a negative `index` (or a null `source`) to clear, matching
 * {@link setVirtualActive}.
 *
 * @internal
 */
export function setVirtualActiveIndexed(
	container: HTMLElement | null,
	source: VirtualItemSource | null,
	index: number,
	activeIndexRef: RefObject<number>,
	activeDescendantRef?: RefObject<HTMLElement | null>,
	{ ariaSelected = true }: { ariaSelected?: boolean } = {},
): void {
	activeIndexRef.current = index

	if (!source || index < 0) {
		applyVirtualActiveDom(container, undefined, activeDescendantRef, ariaSelected)

		return
	}

	source.scrollToIndex(index, { align: 'auto' })

	const id = resolveVirtualItemId(source, index)

	const applied = applyVirtualActiveDom(container, id, activeDescendantRef, ariaSelected)

	if (!applied && container && id) {
		watchForIndexedMount(container, id, index, activeIndexRef, activeDescendantRef, ariaSelected)
	}
}

/**
 * Clears the indexed-source active state: the named reset counterpart to
 * {@link setVirtualActiveIndexed}, mirroring {@link clearVirtualActive}.
 *
 * @internal
 */
export function clearVirtualActiveIndexed(
	container: HTMLElement | null,
	activeIndexRef: RefObject<number>,
	activeDescendantRef?: RefObject<HTMLElement | null>,
): void {
	setVirtualActiveIndexed(container, null, -1, activeIndexRef, activeDescendantRef)
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
	containerEl: HTMLElement | null
	/** Set (with `activeIndexRef`) when navigating an indexed source instead of `items`. */
	itemSource: VirtualItemSource | null
	activeIndexRef: RefObject<number> | undefined
}

/**
 * Resolves the per-keystroke {@link RovingKeyContext} plus the current active
 * element and index, or null when there's nothing to navigate (`items` is
 * empty in DOM mode, `itemSource.count` is 0 in indexed mode). Indexed mode
 * (a virtual `itemSource` paired with `activeIndexRef`) reads the current
 * index off `activeIndexRef` — clamped to the source's live `count`, since a
 * filter can shrink it between keystrokes — instead of scanning the DOM,
 * which may not have the active row mounted.
 *
 * @internal
 */
function resolveRovingContext(
	container: HTMLElement | null,
	itemSelector: string,
	mode: 'focus' | 'virtual',
	config: {
		itemSource: VirtualItemSource | null
		activeIndexRef: RefObject<number> | undefined
		manageTabIndex: boolean
		activeDescendantRef: RefObject<HTMLElement | null> | undefined
		manageAriaSelected: boolean
		scrollIntoView: boolean
		scrollWithin: ScrollWithin
	},
): { ctx: RovingKeyContext; active: HTMLElement | null; currentIndex: number } | null {
	const items = queryItems(container, itemSelector)

	const isVirtual = mode === 'virtual'

	const indexed = config.itemSource && config.activeIndexRef ? config.itemSource : null

	const itemCount = indexed ? indexed.count : items.length

	if (itemCount === 0) return null

	const active = document.activeElement as HTMLElement | null

	const currentIndex = indexed
		? Math.min(config.activeIndexRef?.current ?? -1, indexed.count - 1)
		: resolveDomCurrentIndex(items, isVirtual, active)

	return {
		ctx: {
			items,
			isVirtual,
			manageTabIndex: config.manageTabIndex,
			activeDescendantRef: config.activeDescendantRef,
			manageAriaSelected: config.manageAriaSelected,
			scrollIntoView: config.scrollIntoView,
			scrollWithin: config.scrollWithin,
			containerEl: container,
			itemSource: indexed,
			activeIndexRef: config.activeIndexRef,
		},
		active,
		currentIndex,
	}
}

/** The DOM-mode current index: the `data-active` item in virtual mode, the focused item otherwise. @internal */
function resolveDomCurrentIndex(
	items: HTMLElement[],
	isVirtual: boolean,
	active: HTMLElement | null,
): number {
	return isVirtual
		? items.findIndex((el) => el.dataset.active !== undefined)
		: items.indexOf(active as HTMLElement)
}

/**
 * {@link nextIndexForKey} extended to skip indices `isDisabled` marks: walks
 * from the naive target in the key's implied direction, wrapping until it
 * finds an enabled index or exhausts the source (returns null). DOM-mode
 * roving gets disabled-skipping for free — `itemSelector` excludes disabled
 * rows from `items` entirely — but an index-based source has no DOM to
 * filter, so the walk is explicit. Grid (`cols`) navigation is out of scope:
 * `itemSource` targets flat option lists, so the walk always treats `key` as
 * linear.
 *
 * @internal
 */
function nextIndexedKey(
	key: string,
	currentIndex: number,
	count: number,
	config: NavigationConfig,
	isDisabled: ((index: number) => boolean) | undefined,
): number | null {
	const base = nextIndexForKey(key, currentIndex, count, config)

	if (base === null || !isDisabled || !isDisabled(base)) return base

	const forward = config.orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown'

	const direction = key === 'Home' || key === forward ? 1 : -1

	let index = base

	for (let steps = 0; steps < count; steps++) {
		index = (((index + direction) % count) + count) % count

		if (index === currentIndex) return null

		if (!isDisabled(index)) return index
	}

	return null
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

	if (ctx.itemSource && ctx.activeIndexRef) {
		setVirtualActiveIndexed(
			ctx.containerEl,
			ctx.itemSource,
			index,
			ctx.activeIndexRef,
			ctx.activeDescendantRef,
			{ ariaSelected: ctx.manageAriaSelected },
		)

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
	activationKey: string | readonly string[] | null,
): boolean {
	if (!ctx.isVirtual || !activationKey) return false

	const keys = typeof activationKey === 'string' ? [activationKey] : activationKey

	if (!keys.includes(event.key)) return false

	if (currentIndex === -1) return true

	event.preventDefault()

	if (ctx.itemSource) {
		const id = resolveVirtualItemId(ctx.itemSource, currentIndex)

		const node = id ? document.getElementById(id) : null

		// A jump landed on a not-yet-mounted row (the move's mount watcher
		// hasn't caught up yet); nothing to click until it renders.
		node?.click()

		return true
	}

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
	matchTypeaheadIndexed: ReturnType<typeof useTypeaheadIndexed>,
	typeahead: boolean,
): boolean {
	if (!typeahead || !isTypeaheadKey(event)) return false

	if (ctx.itemSource) {
		const source = ctx.itemSource

		// No text values to match against; consume the key rather than fall
		// through to main-axis nav, mirroring the DOM path's "no match" no-op.
		if (!source.getTextValue) return true

		const index = matchTypeaheadIndexed(
			source.count,
			source.getTextValue,
			source.isDisabled,
			event.key,
			currentIndex,
		)

		if (index !== null) {
			event.preventDefault()

			moveTo(index, ctx)
		}

		return true
	}

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

	const nextIndex = ctx.itemSource
		? nextIndexedKey(
				event.key,
				currentIndex,
				ctx.itemSource.count,
				{ cols: opts.cols, orientation: opts.orientation },
				ctx.itemSource.isDisabled,
			)
		: nextIndexForKey(event.key, currentIndex, ctx.items.length, {
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
	/**
	 * Virtual mode: key (or keys) that clicks the active item. A menu passes
	 * `['Enter', ' ']` so Space activates like Enter (APG menu pattern); a text
	 * input owner keeps the default `'Enter'` so Space still types. Pass `null`
	 * to disable. @defaultValue 'Enter'
	 */
	activationKey?: string | readonly string[] | null
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
	/**
	 * Virtual mode: pluggable index-based item source for a windowed list,
	 * where options outside the rendered window never mount in the DOM (see
	 * `VirtualOptions`). When both this and `activeIndexRef` are set, arrow /
	 * Home / End / type-ahead navigate `itemSource.current` by index instead of
	 * querying `itemSelector`, calling `scrollToIndex` to mount the target row
	 * and applying the highlight once it renders (`setVirtualActiveIndexed`
	 * watches for the mount, since the row doesn't render synchronously). Leave
	 * unset for the default DOM-query source — every existing consumer,
	 * unchanged.
	 */
	itemSource?: RefObject<VirtualItemSource | null>
	/**
	 * Virtual mode + `itemSource`: caller-owned box for the logical active
	 * index. Required alongside `itemSource` because a windowed-out active row
	 * has no DOM `data-active` marker for the hook to read the index back off
	 * of between keystrokes. The caller also writes it directly, via
	 * `setVirtualActiveIndexed`, to seed the highlight outside a keypress — on
	 * open, on a filter change.
	 */
	activeIndexRef?: RefObject<number>
}

/**
 * Arrow / Home / End navigation over items inside `containerRef`. Wraps at
 * both ends; with `row`, the cross arrows rove into per-row action controls.
 * Composes `nextIndexForKey` (key → index math) and `useTypeahead` with the
 * DOM choreography: focus or virtual active-state moves, single-Tab-stop
 * `tabIndex` ownership, and row cross-axis roving. Pass `itemSource` (with
 * `activeIndexRef`) to navigate a windowed list by index instead, reaching
 * items the DOM query can't see.
 *
 * @returns A stable `onKeyDown` handler to attach to the container; it reads
 * items from `containerRef` on each press, so the item set may change between
 * presses. The `tabIndex` ownership (focus mode + `manageTabIndex`) and the
 * `aria-activedescendant` mirroring run as an effect, independent of the
 * handler.
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
		itemSource,
		activeIndexRef,
	}: RovingOptions,
) {
	const scrollWithin = useScrollWithin()

	// Depend on the selector strings, not the `row` object: callers pass inline
	// literals whose identity changes per render.
	const rowSelector = row?.rowSelector

	const actionSelector = row?.actionSelector

	const matchTypeahead = useTypeahead()

	const matchTypeaheadIndexed = useTypeaheadIndexed()

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
			const resolved = resolveRovingContext(containerRef.current, itemSelector, mode, {
				itemSource: itemSource?.current ?? null,
				activeIndexRef,
				manageTabIndex,
				activeDescendantRef,
				manageAriaSelected,
				scrollIntoView,
				scrollWithin,
			})

			if (!resolved) return

			const { ctx, active, currentIndex } = resolved

			const rowResult = processRowContext(event, ctx.containerEl, active, currentIndex, {
				items: ctx.items,
				itemSelector,
				actionSelector,
				rowSelector,
				orientation,
				cols,
				isVirtual: ctx.isVirtual,
			})

			if (rowResult.handled) return

			if (handleActivationKey(event, ctx, rowResult.currentIndex, activationKey)) return

			if (
				handleTypeahead(
					event,
					ctx,
					rowResult.currentIndex,
					matchTypeahead,
					matchTypeaheadIndexed,
					typeahead,
				)
			)
				return

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
			matchTypeaheadIndexed,
			itemSource,
			activeIndexRef,
		],
	)
}
