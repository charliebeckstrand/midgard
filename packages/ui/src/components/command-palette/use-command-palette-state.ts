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

	// Bypass deferral on empty query: the palette resets it on close and on every
	// open, so the deferred copy would otherwise paint one stale frame of the
	// prior filter.
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

	// When the filter changes, move the keyboard highlight to the top result so
	// data-active / aria-selected / the input's aria-activedescendant always
	// point at a real option instead of dangling on one the filter removed (or
	// clear them when nothing matches). Guarded against the initial value so
	// opening the palette still leaves the first arrow key to pick the first
	// item; arrow keys take over from there.
	const lastDeferredRef = useRef(deferredQuery)

	useEffect(() => {
		if (lastDeferredRef.current === deferredQuery) return

		lastDeferredRef.current = deferredQuery

		const items = queryItems(listRef.current, ITEM_SELECTOR)

		setVirtualActive(items, items.length > 0 ? 0 : -1, inputRef)
	}, [deferredQuery])

	// Reset query when closed (adjust during render to avoid extra cycle)
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
