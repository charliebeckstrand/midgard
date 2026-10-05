'use client'

import {
	type KeyboardEvent,
	useCallback,
	useDeferredValue,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import {
	seedVirtualTopMatch,
	useA11yRoving,
	type VirtualItemSource,
} from '../../hooks/a11y/use-a11y-roving'
import { useStableEvent } from '../../hooks/use-stable-event'
import { isReservedTextboxKey } from '../combobox/use-combobox-input'

type CommandPaletteStateOptions = {
	open: boolean
	onOpenChange: (open: boolean) => void
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
 * @returns `false` while no listbox is attached.
 */
function useEmptyResults(list: HTMLElement | null): boolean {
	const [empty, setEmpty] = useState(false)

	// A layout effect, so that the first measure lands before the paint and the
	// no-results text does not flash.
	useLayoutEffect(() => {
		if (!list) {
			setEmpty(false)

			return
		}

		const measure = () => {
			setEmpty(list.querySelector(RESULT_SELECTOR) === null)
		}

		measure()

		const observer = new MutationObserver(measure)

		observer.observe(list, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['data-empty'],
		})

		return () => observer.disconnect()
	}, [list])

	return empty
}

/**
 * Query, deferred query, and virtual-roving wiring for {@link CommandPalette}.
 * It returns the search value plus the refs and `onKeyDown` that drive
 * `aria-activedescendant` highlighting over options while focus stays on the
 * input. Resets the query on close and keeps the highlight on the top result as
 * the filtered set changes, through `seedVirtualTopMatch`. `virtualSourceRef` is the registration point a
 * `VirtualOptions` (with `getOptionId`) inside `children` publishes into, so the
 * arrow keys reach items outside a windowed list. Navigation is arrow-only —
 * roving `typeahead` stays off, since the search input owns printable keys.
 * `onActiveChange` reports the highlighted option's id after each route that
 * moves it: an arrow key, a filter change, and the close that clears it.
 * `empty` is true while the listbox holds no result. It drives the no-results
 * text and `aria-expanded`, and `attachList` attaches the listbox it reads.
 *
 * @internal
 * @see {@link useA11yRoving}
 */
export function useCommandPaletteState({
	open,
	onOpenChange,
	onActiveChange,
}: CommandPaletteStateOptions) {
	const [query, setQuery] = useState('')

	// Bypasses deferral on empty query: the deferred copy paints one stale
	// frame of the prior filter when the palette resets on open/close.
	const deferredQueryInternal = useDeferredValue(query)

	const deferredQuery = query === '' ? '' : deferredQueryInternal

	const listboxId = useId()

	const inputRef = useRef<HTMLInputElement>(null)

	const listRef = useRef<HTMLDivElement>(null)

	// The listbox mounts with the portal of the dialog, after the open commits.
	// The emptiness probe keys on this state, so that it reads the listbox when
	// it attaches. The ref serves the key handlers and the seed.
	const [listNode, setListNode] = useState<HTMLDivElement | null>(null)

	const attachList = useCallback((node: HTMLDivElement | null) => {
		listRef.current = node

		setListNode(node)
	}, [])

	const empty = useEmptyResults(listNode)

	// Registered by a `VirtualOptions` (with `getOptionId`) inside `children`,
	// via `VirtualItemSourceContext`; null for a non-virtualized palette, which
	// keeps the DOM-query roving below unchanged.
	const virtualSourceRef = useRef<VirtualItemSource | null>(null)

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
			if (isReservedTextboxKey(event)) return

			rovingKeyDown(event)

			// The roving handler writes the attribute synchronously, so the read is
			// of the highlight this keypress just moved.
			reportActiveFromDom()
		},
		[rovingKeyDown, reportActiveFromDom],
	)

	// On each filter change, moves the keyboard highlight to the top result so
	// `data-active` / `aria-selected` / `aria-activedescendant` point at a live
	// option (or are cleared when nothing matches). Skipped on the initial
	// value; the first arrow key on open picks the first item. Under a
	// registered `virtualSourceRef`, index math replaces the DOM query (a
	// windowed-out item isn't in the DOM to find).
	const lastDeferredRef = useRef(deferredQuery)

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

		reportActiveFromDom()
	}, [deferredQuery, open, reportActiveFromDom])

	// Resets the query when closed, during render rather than in an effect, so
	// the closing palette paints no stale filter.
	const [prevOpen, setPrevOpen] = useState(open)

	if (open !== prevOpen) {
		setPrevOpen(open)

		if (!open) setQuery('')
	}

	// The closing panel unmounts its options, so nothing is highlighted any more.
	// Clearing `activeIndexRef` stops a virtualized palette from resuming
	// navigation at the prior session's index on reopen: the closed dialog
	// unmounts its options, so there's no DOM `data-active` to read the index back
	// off of, and a stale ref would make the first arrow land at `index + 1`
	// instead of the first item (mirrors Combobox's close reset). The report is a
	// side effect, so it waits for the commit. `reportActive` dedupes, so a
	// palette that closed with no highlight is silent.
	useEffect(() => {
		if (open) return

		activeIndexRef.current = -1

		reportActive(null)
	}, [open, reportActive])

	const close = useCallback(() => onOpenChange(false), [onOpenChange])

	const context = useMemo(() => ({ close }), [close])

	return {
		query,
		deferredQuery,
		setQuery,
		listboxId,
		inputRef,
		listRef,
		attachList,
		empty,
		onKeyDown,
		close,
		context,
		virtualSourceRef,
	}
}
