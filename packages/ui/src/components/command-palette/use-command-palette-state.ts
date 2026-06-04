'use client'

import { useCallback, useDeferredValue, useId, useMemo, useRef, useState } from 'react'
import { useRoving } from '../../hooks'

type UseCommandPaletteStateOptions = {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function useCommandPaletteState({ open, onOpenChange }: UseCommandPaletteStateOptions) {
	const [query, setQueryState] = useState('')

	// Bypass deferral on empty query: the palette resets it on close and on every
	// open, so the deferred copy would otherwise paint one stale frame of the
	// prior filter.
	const deferredQueryInternal = useDeferredValue(query)

	const deferredQuery = query === '' ? '' : deferredQueryInternal

	const listboxId = useId()

	const inputRef = useRef<HTMLInputElement>(null)

	const listRef = useRef<HTMLDivElement>(null)

	const onKeyDown = useRoving(listRef, {
		mode: 'virtual',
		itemSelector: '[data-slot="command-palette-item"]:not([data-disabled])',
		ownerRef: inputRef,
	})

	// The active option is mirrored onto the input's aria-activedescendant as the
	// user arrows through results. Typing remounts the filtered options, so the
	// held reference would dangle — clear it on every query change, leaving
	// navigation to re-establish it against the new result set.
	const setQuery = useCallback((next: string) => {
		setQueryState(next)

		inputRef.current?.removeAttribute('aria-activedescendant')
	}, [])

	// Reset query when closed (adjust during render to avoid extra cycle)
	const prevOpenRef = useRef(open)

	if (open !== prevOpenRef.current) {
		prevOpenRef.current = open

		if (!open) setQueryState('')
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
