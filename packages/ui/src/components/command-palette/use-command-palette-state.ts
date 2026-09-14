'use client'

import {
	type KeyboardEvent,
	useCallback,
	useDeferredValue,
	useEffect,
	useEffectEvent,
	useId,
	useMemo,
	useRef,
	useState,
} from 'react'
import {
	seedVirtualTopMatch,
	useA11yRoving,
	type VirtualItemSource,
} from '../../hooks/a11y/use-a11y-roving'
import { isReservedTextboxKey } from '../combobox/use-combobox-input'

type CommandPaletteStateOptions = {
	open: boolean
	onOpenChange: (open: boolean) => void
	onActiveChange?: (optionId: string | null) => void
}

const ITEM_SELECTOR = '[data-slot="command-palette-item"]:not([data-disabled])'

/**
 * Query, deferred query, and virtual-roving wiring for {@link CommandPalette}:
 * the search value plus the refs and `onKeyDown` that drive
 * `aria-activedescendant` highlighting over options while focus stays on the
 * input. Resets the query on close and keeps the highlight on the top result as
 * the filtered set changes. `virtualSourceRef` is the registration point a
 * `VirtualOptions` (with `getOptionId`) inside `children` publishes into, so the
 * arrow keys reach items outside a windowed list. Navigation is arrow-only —
 * roving `typeahead` stays off, since the search input owns printable keys.
 * `onActiveChange` reports the highlighted option's id after each route that
 * moves it: an arrow key, a filter change, and the close that clears it.
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
	 * rather than through state, so there is no committed React value to watch —
	 * the attribute IS the state. Read back rather than tracked in parallel,
	 * because the index and the DOM part company under a windowed list, and this
	 * is the id the reader's assistive technology is given.
	 */
	const notifyActiveChange = useEffectEvent((optionId: string | null) => {
		onActiveChange?.(optionId)
	})

	const reportedActiveRef = useRef<string | null>(null)

	const reportActive = useCallback((next: string | null) => {
		if (reportedActiveRef.current === next) return

		reportedActiveRef.current = next

		notifyActiveChange(next)
	}, [])

	const reportsRef = useRef(onActiveChange !== undefined)

	reportsRef.current = onActiveChange !== undefined

	const reportActiveFromDom = useCallback(() => {
		if (!reportsRef.current) return

		reportActive(inputRef.current?.getAttribute('aria-activedescendant') ?? null)
	}, [reportActive])

	const rovingKeyDown = useA11yRoving(listRef, {
		mode: 'virtual',
		itemSelector: ITEM_SELECTOR,
		activeDescendantRef: inputRef,
		itemSource: virtualSourceRef,
		activeIndexRef,
	})

	// The roving handler drives an `aria-activedescendant` highlight while focus
	// stays in the search textbox. Reserve the keys that belong to the textbox
	// itself — Home/End move the caret, Shift+Arrow extends the selection — so
	// they aren't swallowed to move the option highlight (shared with Combobox).
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

		// A closing palette resets its own highlight in the render-phase branch
		// below. Don't re-seed on the close-time query→'' transition: the options
		// are still mounted through the exit animation, so seeding would write the
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

	// Resets the query and the virtual-highlight index when closed; done during
	// render, not in an effect. Clearing `activeIndexRef` stops a virtualized
	// palette from resuming navigation at the prior session's index on reopen:
	// the closed dialog unmounts its options, so there's no DOM `data-active` to
	// read the index back off of, and a stale ref would make the first arrow land
	// at `index + 1` instead of the first item (mirrors Combobox's close reset).
	const prevOpenRef = useRef(open)

	if (open !== prevOpenRef.current) {
		prevOpenRef.current = open

		if (!open) {
			setQuery('')

			activeIndexRef.current = -1
		}
	}

	// The closing panel unmounts its options, so nothing is highlighted any more.
	// Reported from an effect rather than beside the render-phase reset above,
	// because a report is a side effect and the render phase is no place for one.
	// `reportActive` dedupes, so a palette that closed with no highlight is silent.
	useEffect(() => {
		if (open) return

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
		onKeyDown,
		close,
		context,
		virtualSourceRef,
	}
}
