'use client'

import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react'
import { queryItems, setVirtualActive, useA11yRoving } from '../../hooks/a11y/use-a11y-roving'

type CommandPaletteStateOptions = {
	open: boolean
	onOpenChange: (open: boolean) => void
}

const ITEM_SELECTOR = '[data-slot="command-palette-item"]:not([data-disabled])'

export function useCommandPaletteState({ open, onOpenChange }: CommandPaletteStateOptions) {
	const [query, setQuery] = useState('')

	// Bypasses deferral on empty query: the deferred copy paints one stale
	// frame of the prior filter when the palette resets on open/close.
	const deferredQueryInternal = useDeferredValue(query)

	const deferredQuery = query === '' ? '' : deferredQueryInternal

	const listboxId = useId()

	const inputRef = useRef<HTMLInputElement>(null)

	const listRef = useRef<HTMLDivElement>(null)

	const onKeyDown = useA11yRoving(listRef, {
		mode: 'virtual',
		itemSelector: ITEM_SELECTOR,
		activeDescendantRef: inputRef,
	})

	// On each filter change, moves the keyboard highlight to the top result so
	// `data-active` / `aria-selected` / `aria-activedescendant` point at a live
	// option (or are cleared when nothing matches). Skipped on the initial
	// value; the first arrow key on open picks the first item.
	const lastDeferredRef = useRef(deferredQuery)

	useEffect(() => {
		if (lastDeferredRef.current === deferredQuery) return

		lastDeferredRef.current = deferredQuery

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

	const context = useMemo(() => ({ close, query, deferredQuery }), [close, query, deferredQuery])

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
	}
}
