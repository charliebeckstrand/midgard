'use client'

import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRoving } from '../../hooks'

type UseCommandPaletteStateOptions = {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function useCommandPaletteState({ open, onOpenChange }: UseCommandPaletteStateOptions) {
	const [query, setQuery] = useState('')

	const listboxId = useId()

	const inputRef = useRef<HTMLInputElement>(null)

	const listRef = useRef<HTMLDivElement>(null)

	const onKeyDown = useRoving(listRef, {
		mode: 'virtual',
		itemSelector: '[data-slot="command-palette-item"]:not([data-disabled])',
	})

	// Reset query when closed (adjust during render to avoid extra cycle)
	const prevOpenRef = useRef(open)

	if (open !== prevOpenRef.current) {
		prevOpenRef.current = open

		if (!open) setQuery('')
	}

	// Focus input on open
	useLayoutEffect(() => {
		if (open) inputRef.current?.focus()
	}, [open])

	const close = useCallback(() => onOpenChange(false), [onOpenChange])

	const context = useMemo(() => ({ close, query }), [close, query])

	return { query, setQuery, listboxId, inputRef, listRef, onKeyDown, close, context }
}
