'use client'

import { type RefObject, useCallback, useDeferredValue, useState } from 'react'
import { useControllable } from '../../hooks/use-controllable'
import { useDeferredToggle } from '../../hooks/use-deferred-toggle'

type ComboboxStateParams<T> = {
	multiple: boolean
	nullable: boolean
	selectable: boolean
	value: T | T[] | undefined
	closeOnSelect?: boolean
	open?: boolean
	onOpenChange?: (open: boolean) => void
	onQueryChange?: (query: string) => void
	onValueChange?: (value: T) => void
	setValue: (
		value: T | T[] | undefined | ((prev: T | T[] | undefined) => T | T[] | undefined),
	) => void
	inputRef: RefObject<HTMLInputElement | null>
}

export function useComboboxState<T>({
	multiple,
	nullable,
	selectable,
	value,
	closeOnSelect,
	open: openProp,
	onOpenChange,
	onQueryChange,
	onValueChange,
	setValue,
	inputRef,
}: ComboboxStateParams<T>) {
	const [query, setQueryInternal] = useState('')

	// Bypass deferral on empty query: select() clears it in multi-select while
	// the panel stays open, so the deferred copy would otherwise paint one stale
	// frame of the prior filter.
	const deferredQueryInternal = useDeferredValue(query)

	const deferredQuery = query === '' ? '' : deferredQueryInternal

	const [open = false, setOpen] = useControllable<boolean>({
		value: openProp,
		defaultValue: false,
		onValueChange: (next) => onOpenChange?.(next ?? false),
	})

	const [editing, setEditing] = useState(false)

	const setQuery = useCallback(
		(next: string) => {
			setQueryInternal(next)

			onQueryChange?.(next)
		},
		[onQueryChange],
	)

	const close = useCallback(() => {
		setOpen(false)

		setQuery('')

		setEditing(false)
	}, [setOpen, setQuery])

	const shouldClose = closeOnSelect ?? !multiple

	const { toggle, commit, flushPending, selectionValue } = useDeferredToggle<T>({
		multiple,
		nullable,
		value,
		setValue,
	})

	const select = useCallback(
		(newValue: T) => {
			if (!selectable) {
				onValueChange?.(newValue)
			} else if (shouldClose) {
				commit(newValue)
			} else {
				toggle(newValue)
			}

			if (shouldClose) {
				close()
			} else {
				setQuery('')

				setEditing(false)

				inputRef.current?.focus()
			}
		},
		[selectable, shouldClose, toggle, commit, onValueChange, close, setQuery, inputRef],
	)

	return {
		query,
		deferredQuery,
		setQuery,
		open,
		setOpen,
		editing,
		setEditing,
		close,
		select,
		flushPending,
		selectionValue,
	}
}
