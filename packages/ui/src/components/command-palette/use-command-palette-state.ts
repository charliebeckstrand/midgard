'use client'

import {
	type KeyboardEvent,
	type RefObject,
	useCallback,
	useDeferredValue,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import {
	isVirtualActiveRowGone,
	isVirtualTopMatchSeated,
	seedVirtualTopMatch,
	useA11yRoving,
	type VirtualItemSource,
} from '../../hooks/a11y/use-a11y-roving'
import { useComposedRef } from '../../hooks/use-composed-ref'
import { useStableEvent } from '../../hooks/use-stable-event'
import { isReservedTextboxKey } from '../combobox/use-combobox-input'

type CommandPaletteStateOptions = {
	open: boolean
	onActiveChange?: (optionId: string | null) => void
}

const ITEM_SELECTOR = '[data-slot="command-palette-item"]:not([data-disabled])'

// A result in the listbox: a rendered option, or a `VirtualOptions` wrapper that
// holds items. The wrapper stamps `data-empty` from the length of its items,
// which is also the `count` of the source it registers. The probe reads the
// stamp and not the source: the source registers in an effect, which can run
// after the observer reports the mutation.
const RESULT_SELECTOR = '[role="option"], [data-slot="virtual-options"]:not([data-empty])'

/**
 * Whether the listbox holds no result, measured again as its subtree changes.
 * A consumer that filters on its own state changes the options with no render
 * of the palette, so a `MutationObserver` watches the listbox. It also watches
 * `data-empty`, which a `VirtualOptions` wrapper toggles with no change to its
 * rows when its window holds none.
 *
 * @param list - The listbox, held as state, because it mounts with the portal
 * of the dialog a commit after the open.
 * @param onChange - Runs after each measure that a change of the subtree
 * causes. The palette seeds the highlight again from it.
 * @returns `false` while no listbox is attached.
 */
function useEmptyResults(list: HTMLElement | null, onChange: () => void): boolean {
	const [empty, setEmpty] = useState(false)

	// A layout effect, so that the first measure lands before the paint and the
	// no-results text does not flash.
	useLayoutEffect(() => {
		if (!list) return

		// A write of the same value still costs a render of the palette while a
		// deferred render is pending, so the probe writes only a change.
		let last: boolean | undefined

		const measure = () => {
			const next = list.querySelector(RESULT_SELECTOR) === null

			if (next === last) return

			last = next

			setEmpty(next)
		}

		measure()

		const observer = new MutationObserver(() => {
			measure()

			onChange()
		})

		observer.observe(list, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['data-empty'],
		})

		return () => observer.disconnect()
	}, [list, onChange])

	// The state from the last attach stays while no listbox is attached. The
	// first measure after the next attach writes it before the paint.
	return list !== null && empty
}

/**
 * The ref that a `VirtualOptions` inside the palette registers its item source
 * into. Each write of a source calls `onRegister` with it.
 *
 * @remarks A registration is the signal that the source changed by identity or
 * by count. The primitive registers in an effect, which can run after the
 * observer of the listbox reports the new rows. The observer can thus read the
 * prior source, and the registration cannot. The cleanup of a registration
 * writes `null` before the next source registers, and that write calls nothing.
 * @internal
 */
function createSourceRegistry(
	onRegister: (source: VirtualItemSource) => void,
): RefObject<VirtualItemSource | null> {
	let current: VirtualItemSource | null = null

	return {
		get current() {
			return current
		},
		set current(next) {
			current = next

			if (next) onRegister(next)
		},
	}
}

/**
 * Query, deferred query, and virtual-roving wiring for {@link CommandPalette}.
 * It returns the search value plus the refs and `onKeyDown` that drive
 * `aria-activedescendant` highlighting over options while focus stays on the
 * input. Resets the query on close and keeps the highlight on the top result as
 * the filtered set changes, through `seedVirtualTopMatch`. A seeded highlight
 * also follows a change of the results under an unchanged query: the observer
 * of the listbox and the registration of a source tell of it. A highlight that
 * is empty by design on open stays empty. A highlight that an arrow key moved
 * stays while its row exists, and the top result takes it when the row goes.
 * `virtualSourceRef` is the registration point a
 * `VirtualOptions` (with `getOptionId`) inside `children` publishes into, so the
 * arrow keys reach items outside a windowed list. Navigation is arrow-only —
 * roving `typeahead` stays off, since the search input owns printable keys.
 * `onActiveChange` reports the highlighted option's id after each route that
 * moves it: an arrow key, a filter change, a change of the results, and the
 * close that clears it.
 * `empty` is true while the listbox holds no result. It drives the no-results
 * text and `aria-expanded`, and `attachList` attaches the listbox it reads.
 * An Enter that lands while the deferred query lags the input waits for the
 * results of the query, and then runs the highlighted row. A new keystroke,
 * Escape, a close, or a change of the query drops it.
 *
 * @internal
 * @see {@link useA11yRoving}
 */
export function useCommandPaletteState({ open, onActiveChange }: CommandPaletteStateOptions) {
	const [query, setQuery] = useState('')

	// Bypasses deferral on empty query: the deferred copy paints one stale
	// frame of the prior filter when the palette resets on open/close.
	const deferredQueryInternal = useDeferredValue(query)

	const deferredQuery = query === '' ? '' : deferredQueryInternal

	// True while the deferred query lags the input. The listbox then holds the
	// results of an earlier query, and the highlight sits on one of them.
	const lagging = query !== deferredQuery

	// An Enter that landed while the deferred query lagged, and the query that it
	// landed on. It waits for the results of that query.
	const heldEnterRef = useRef<{ event: KeyboardEvent<HTMLInputElement>; query: string } | null>(
		null,
	)

	const listboxId = useId()

	const inputRef = useRef<HTMLInputElement>(null)

	const listRef = useRef<HTMLDivElement>(null)

	// The listbox mounts with the portal of the dialog, after the open commits.
	// The emptiness probe keys on this state, so that it reads the listbox when
	// it attaches. The ref serves the key handlers and the seed.
	const [listNode, setListNode] = useState<HTMLDivElement | null>(null)

	const attachList = useComposedRef(listRef, setListNode)

	// Logical active index for the virtual source; see `Combobox` for why this
	// can't be read back off the DOM.
	const activeIndexRef = useRef(-1)

	/*
	 * The highlight's one readout, reported after each route that moves it.
	 *
	 * The roving hook writes `aria-activedescendant` on the input imperatively
	 * rather than through state, so there is no committed React value to watch.
	 * The attribute IS the state. It is read back rather than tracked in parallel,
	 * because the index and the DOM part company under a windowed list. This is
	 * the id the reader's assistive technology is given.
	 */
	const reportedActiveRef = useRef<string | null>(null)

	const reportActive = useStableEvent((next: string | null) => {
		if (reportedActiveRef.current === next) return

		reportedActiveRef.current = next

		onActiveChange?.(next)
	})

	const reportActiveFromDom = useStableEvent(() => {
		if (onActiveChange === undefined) return

		reportActive(inputRef.current?.getAttribute('aria-activedescendant') ?? null)
	})

	// True while the highlight is where the last filter change seeded it. It is
	// false on open, where the highlight is empty by design, and after a key
	// moves the highlight. The close sets it to false for the next open.
	const seededRef = useRef(false)

	// Seeds the top result again when the results change under an unchanged
	// query, as when data arrives after a filter ran. A seeded highlight follows
	// the results. A change that keeps the top result does not seed, so the list
	// does not scroll back to it. A highlight that a key moved stays while its
	// row exists, and the top result takes it when the row goes, as in Combobox.
	const followResults = useStableEvent((source: VirtualItemSource | null) => {
		if (!open) return

		const list = listRef.current

		if (seededRef.current) {
			if (isVirtualTopMatchSeated(list, ITEM_SELECTOR, source, activeIndexRef, inputRef)) return
		} else if (!isVirtualActiveRowGone(source, activeIndexRef, inputRef)) {
			return
		}

		seedVirtualTopMatch(list, ITEM_SELECTOR, source, activeIndexRef, inputRef)

		seededRef.current = true

		reportActiveFromDom()
	})

	// The deferred query of the last seed. The seed effect below reads and writes
	// it.
	const lastDeferredRef = useRef(deferredQuery)

	// A source that registers in the commit of a filter change runs before the
	// seed effect of that commit, which seeds the same source. Thus only a
	// registration under an unchanged query follows the results.
	const onRegister = useStableEvent((source: VirtualItemSource) => {
		if (lastDeferredRef.current === deferredQuery) followResults(source)
	})

	// Registered by a `VirtualOptions` (with `getOptionId`) inside `children`,
	// via `VirtualItemSourceContext`; null for a non-virtualized palette, which
	// keeps the DOM-query roving below unchanged. Each registration is a change
	// of the source, by identity or by count.
	const [virtualSourceRef] = useState(() => createSourceRegistry(onRegister))

	// The observer of the listbox sees each change of the rows. That is the
	// signal for a palette with no registered source.
	const onListChange = useStableEvent(() => followResults(virtualSourceRef.current))

	const empty = useEmptyResults(listNode, onListChange)

	const rovingKeyDown = useA11yRoving(listRef, {
		mode: 'virtual',
		itemSelector: ITEM_SELECTOR,
		activeDescendantRef: inputRef,
		itemSource: virtualSourceRef,
		activeIndexRef,
	})

	// The roving handler drives an `aria-activedescendant` highlight while focus
	// stays in the search textbox. Reserve the keys that belong to the textbox
	// itself, so they don't move the option highlight or run the active item:
	// Home/End move the caret, Shift+Arrow extends the selection, and an IME
	// composition takes Enter and the arrows (shared with Combobox).
	const onKeyDown = useCallback(
		(event: KeyboardEvent<HTMLInputElement>) => {
			// A new keystroke drops a held Enter, and so does Escape.
			heldEnterRef.current = null

			if (isReservedTextboxKey(event)) return

			// An Enter that lands before the results of the query render would run a
			// result of an earlier query. The palette takes the key and holds it until
			// the results catch up.
			if (event.key === 'Enter' && lagging) {
				event.preventDefault()

				heldEnterRef.current = { event, query }

				return
			}

			const before = inputRef.current?.getAttribute('aria-activedescendant')

			rovingKeyDown(event)

			// The roving handler writes the attribute synchronously, so the read is
			// of the highlight this keypress just moved. A key that moves the
			// highlight makes it the reader's, so a change of the results leaves it.
			if (inputRef.current?.getAttribute('aria-activedescendant') !== before) {
				seededRef.current = false
			}

			reportActiveFromDom()
		},
		[lagging, query, rovingKeyDown, reportActiveFromDom],
	)

	// On each filter change, moves the keyboard highlight to the top result so
	// `data-active` / `aria-selected` / `aria-activedescendant` point at a live
	// option (or are cleared when nothing matches). Skipped on the initial
	// value; the first arrow key on open picks the first item. Under a
	// registered `virtualSourceRef`, index math replaces the DOM query (a
	// windowed-out item isn't in the DOM to find).
	useEffect(() => {
		if (lastDeferredRef.current === deferredQuery) return

		lastDeferredRef.current = deferredQuery

		// A closing palette resets its own highlight in the close effect below.
		// Don't re-seed on the close-time query→'' transition: the options are
		// still mounted through the exit animation, so seeding would write the
		// index back to 0 and reopen at the second item. `deferredQuery` lags
		// `query`, so this transition's effect can run while `open` is already
		// false; guard on it directly.
		if (!open) return

		seedVirtualTopMatch(
			listRef.current,
			ITEM_SELECTOR,
			virtualSourceRef.current,
			activeIndexRef,
			inputRef,
		)

		seededRef.current = true

		reportActiveFromDom()
	}, [deferredQuery, open, reportActiveFromDom, virtualSourceRef])

	// Runs a held Enter when the deferred query catches up. The seed effect above
	// runs first in the same commit, so the Enter runs the highlighted row of the
	// new results. A caught-up list with no result has no highlighted row, so the
	// Enter runs nothing. A close drops the Enter, and so does a change of the
	// query that no keystroke made, such as a paste from the mouse.
	useEffect(() => {
		const held = heldEnterRef.current

		if (!held) return

		const live = open && held.query === query

		if (live && lagging) return

		heldEnterRef.current = null

		if (live) rovingKeyDown(held.event)
	}, [lagging, open, query, rovingKeyDown])

	// Resets the query when closed, during render rather than in an effect, so
	// the closing palette paints no stale filter.
	const [prevOpen, setPrevOpen] = useState(open)

	if (open !== prevOpen) {
		setPrevOpen(open)

		if (!open) setQuery('')
	}

	// The closing panel unmounts its options after its exit animation, so
	// nothing is highlighted any more. Clearing `activeIndexRef` stops a
	// virtualized palette from resuming navigation at the prior session's index
	// on reopen: the closed dialog unmounts its options, so there's no DOM
	// `data-active` to read the index back off of, and a stale ref would make the first arrow land at `index + 1`
	// instead of the first item (mirrors Combobox's close reset). The report is a
	// side effect, so it waits for the commit. `reportActive` dedupes, so a
	// palette that closed with no highlight is silent.
	useEffect(() => {
		if (open) return

		activeIndexRef.current = -1

		seededRef.current = false

		reportActive(null)
	}, [open, reportActive])

	return {
		query,
		deferredQuery,
		setQuery,
		listboxId,
		inputRef,
		attachList,
		empty,
		onKeyDown,
		virtualSourceRef,
	}
}
