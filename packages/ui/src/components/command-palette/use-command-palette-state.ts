'use client'

import {
	type KeyboardEvent,
	useCallback,
	useDeferredValue,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from 'react'
import {
	queryItems,
	setVirtualActive,
	setVirtualActiveIndexed,
	useA11yRoving,
	type VirtualItemSource,
} from '../../hooks/a11y/use-a11y-roving'

type CommandPaletteStateOptions = {
	open: boolean
	onOpenChange: (open: boolean) => void
}

const ITEM_SELECTOR = '[data-slot="command-palette-item"]:not([data-disabled])'

/**
 * Query, deferred query, and virtual-roving wiring for {@link CommandPalette}:
 * the search value plus the refs and `onKeyDown` that drive
 * `aria-activedescendant` highlighting over options while focus stays on the
 * input. Resets the query on close and keeps the highlight on the top result as
 * the filtered set changes. `virtualSourceRef` is the registration point a
 * `VirtualOptions` (with `getOptionId`) inside `children` publishes into, so
 * arrow / type-ahead reach items outside a windowed list.
 *
 * @internal
 * @see {@link useA11yRoving}
 */
export function useCommandPaletteState({ open, onOpenChange }: CommandPaletteStateOptions) {
	const [query, setQuery] = useState('')

	// Bypasses deferral on empty query: the deferred copy paints one stale
	// frame of the prior filter when the palette resets on open/close.
	const deferredQueryRaw = useDeferredValue(query)

	const deferredQuery = query === '' ? '' : deferredQueryRaw

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
	// they aren't swallowed to move the option highlight (mirrors Combobox).
	const onKeyDown = useCallback(
		(event: KeyboardEvent<HTMLInputElement>) => {
			if (event.key === 'Home' || event.key === 'End') return

			if (event.shiftKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) return

			rovingKeyDown(event)
		},
		[rovingKeyDown],
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

		const source = virtualSourceRef.current

		if (source) {
			setVirtualActiveIndexed(
				listRef.current,
				source,
				source.count > 0 ? 0 : -1,
				activeIndexRef,
				inputRef,
			)

			return
		}

		const items = queryItems(listRef.current, ITEM_SELECTOR)

		setVirtualActive(items, items.length > 0 ? 0 : -1, inputRef)
	}, [deferredQuery])

	// Resets query when closed; done during render, not in an effect.
	const prevOpenRef = useRef(open)

	if (open !== prevOpenRef.current) {
		prevOpenRef.current = open

		if (!open) setQuery('')
	}

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
