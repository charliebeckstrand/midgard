'use client'

import { type RefObject, useCallback, useDeferredValue, useEffect, useRef, useState } from 'react'
import { useControllable } from '../../hooks/use-controllable'
import { useDeferredToggle } from '../../hooks/use-deferred-toggle'
import { useFrozenOnClose } from '../../hooks/use-frozen-on-close'

type ComboboxStateParams<T> = {
	multiple: boolean
	nullable: boolean
	value: T | T[] | undefined
	closeOnSelect?: boolean
	open?: boolean
	onOpenChange?: (open: boolean) => void
	onQueryChange?: (query: string) => void
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
 *   the `open` prop. `select` commits or toggles the value, then closes or resets
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
	value,
	closeOnSelect,
	open: openProp,
	onOpenChange,
	onQueryChange,
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

	// Read `onQueryChange` through a ref so `setQuery` stays referentially stable
	// across keystrokes. Carried as a dependency, an inline `onQueryChange` would
	// give `setQuery` — and through it `close`, `select`, and the combobox context
	// — a new identity each render, re-rendering every option on the typing path
	// the refs below (and the deferred query) exist to keep cheap. Mirrors
	// `useControllable`'s own `onValueChange` ref.
	const onQueryChangeRef = useRef(onQueryChange)

	onQueryChangeRef.current = onQueryChange

	const setQuery = useCallback((next: string) => {
		setQueryInternal(next)

		onQueryChangeRef.current?.(next)
	}, [])

	// Snapshot of the query the menu content filters on, frozen while the panel
	// animates closed. Clearing `query` synchronously on close snaps
	// `deferredQuery` to `''` (the empty-query bypass above), re-expanding a
	// filtered list back to its full extent under the still-visible exit
	// animation; a virtual window scrolled to a far-down match then repaints the
	// top of the full list, flickering. Released on exit-complete or reopen.
	const {
		snapshot: frozenQuery,
		freeze: freezeQuery,
		flush: flushFrozenQuery,
	} = useFrozenOnClose<{ query: string; deferredQuery: string }>(open)

	// Latest query values for `close` to snapshot without carrying them as
	// dependencies: with `query` in its deps, `close` — and through it `select`
	// and the combobox context — would take a new identity on every keystroke,
	// re-rendering each option on the typing path the deferred query keeps cheap.
	const queryRef = useRef(query)

	const deferredQueryRef = useRef(deferredQuery)

	useEffect(() => {
		queryRef.current = query

		deferredQueryRef.current = deferredQuery
	})

	const close = useCallback(() => {
		freezeQuery({ query: queryRef.current, deferredQuery: deferredQueryRef.current })

		setOpen(false)

		setQuery('')

		setEditing(false)
	}, [freezeQuery, setOpen, setQuery])

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

		flushFrozenQuery()
	}, [flushToggle, flushFrozenQuery])

	const select = useCallback(
		(newValue: T) => {
			if (shouldClose) {
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
		[shouldClose, toggle, commit, close, setQuery, inputRef],
	)

	return {
		query,
		deferredQuery,
		// The query the menu content reads: frozen at its close-time snapshot
		// until flushPending, so the filtered set (and any deeply scrolled virtual
		// window) holds steady through the exit animation instead of re-expanding.
		menuQuery: frozenQuery ? frozenQuery.value.query : query,
		menuDeferredQuery: frozenQuery ? frozenQuery.value.deferredQuery : deferredQuery,
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
