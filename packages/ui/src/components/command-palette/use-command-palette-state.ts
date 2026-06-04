'use client'

import { useCallback, useDeferredValue, useId, useMemo, useRef, useState } from 'react'
import { useRoving } from '../../hooks'

type UseCommandPaletteStateOptions = {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function useCommandPaletteState({ open, onOpenChange }: UseCommandPaletteStateOptions) {
	const [query, setQuery] = useState('')

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
		activeDescendantRef: inputRef,
	})

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
