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

/**
 * Query, open, editing, and selection state for the combobox root.
 *
 * @returns `{ query, deferredQuery, setQuery, open, setOpen, editing,
 *   setEditing, close, select, flushPending, selectionValue }`. `query` tracks
 *   every keystroke; `deferredQuery` lags for filtering but snaps to empty
 *   immediately so clearing the filter is instant. `open` is controllable via
 *   the `open` prop. `select` routes through `useSelectableValueChange` semantics:
 *   notify-only when `!selectable`, otherwise commit or toggle; closes or resets
 *   the query and refocuses the input depending on `closeOnSelect` (defaults to
 *   single-selection). `selectionValue`/`flushPending` come from the deferred
 *   toggle so the menu reads a value frozen until the panel finishes closing.
 * @remarks `closeOnSelect` defaults to `true` for single, `false` for multiple.
 * @internal
 */
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

	// An empty query bypasses deferral; the filter clears immediately.
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
		open,
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
