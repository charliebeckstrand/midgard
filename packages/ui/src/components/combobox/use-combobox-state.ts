'use client'

import { type RefObject, useCallback, useDeferredValue, useEffect, useRef, useState } from 'react'
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
 *   `menuQuery`/`menuDeferredQuery` are the query the *menu content* reads,
 *   frozen at their close-time snapshot until `flushPending` runs so the filter
 *   (and thus a deeply scrolled virtual window) holds steady through the exit
 *   animation instead of snapping back to the full list.
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

	// Snapshot of the query the menu content filters on, frozen while the panel
	// animates closed. Clearing `query` synchronously on close snaps
	// `deferredQuery` to `''` (the empty-query bypass above), re-expanding a
	// filtered list back to its full extent under the still-visible exit
	// animation; a virtual window scrolled to a far-down match then repaints the
	// top of the full list, flickering. `null` means "track the live query".
	const [frozenQuery, setFrozenQuery] = useState<{ query: string; deferredQuery: string } | null>(
		null,
	)

	const close = useCallback(() => {
		setFrozenQuery({ query, deferredQuery })

		setOpen(false)

		setQuery('')

		setEditing(false)
	}, [setOpen, setQuery, query, deferredQuery])

	const shouldClose = closeOnSelect ?? !multiple

	const {
		toggle,
		commit,
		flushPending: flushToggle,
		selectionValue,
	} = useDeferredToggle<T>({
		multiple,
		nullable,
		value,
		setValue,
		open,
	})

	// Release the frozen selection *and* the frozen query together on
	// exit-complete; both were snapshotted for the same close animation.
	const flushPending = useCallback(() => {
		flushToggle()

		setFrozenQuery(null)
	}, [flushToggle])

	// Clear the freeze when the menu reopens: an interrupted exit (reopen
	// mid-close) skips onExitComplete, so flushPending never runs. Mirrors the
	// deferred toggle's own reopen guard.
	const prevOpenRef = useRef(open)

	useEffect(() => {
		const wasOpen = prevOpenRef.current

		prevOpenRef.current = open

		if (open && !wasOpen) setFrozenQuery(null)
	}, [open])

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
		// The query the menu content reads: frozen at its close-time snapshot
		// until flushPending, so the filtered set (and any deeply scrolled virtual
		// window) holds steady through the exit animation instead of re-expanding.
		menuQuery: frozenQuery ? frozenQuery.query : query,
		menuDeferredQuery: frozenQuery ? frozenQuery.deferredQuery : deferredQuery,
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
