import { type RefObject, useCallback, useDeferredValue, useState } from 'react'
import { useDeferredToggle } from '../../hooks/use-deferred-toggle'

type UseComboboxStateParams<T> = {
	multiple: boolean
	nullable: boolean
	selectable: boolean
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
	closeOnSelect,
	open: openProp,
	onOpenChange,
	onQueryChange,
	onValueChange,
	setValue,
	inputRef,
}: UseComboboxStateParams<T>) {
	const [query, setQueryInternal] = useState('')

	// Skip the one-frame lag when the query empties — select() clears the query
	// in multi-select mode and the panel stays open, so a stale filtered list
	// would flash before catching up. An empty query renders the full list,
	// which is the cheap case anyway.
	const deferredQueryInternal = useDeferredValue(query)

	const deferredQuery = query === '' ? '' : deferredQueryInternal

	const [internalOpen, setInternalOpen] = useState(false)

	const [editing, setEditing] = useState(false)

	const isOpenControlled = openProp !== undefined

	const open = isOpenControlled ? openProp : internalOpen

	const setOpen = useCallback(
		(next: boolean) => {
			if (!isOpenControlled) setInternalOpen(next)

			onOpenChange?.(next)
		},
		[isOpenControlled, onOpenChange],
	)

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

	const { toggle, enqueue, flushPending } = useDeferredToggle<T>({ multiple, nullable, setValue })

	const select = useCallback(
		(newValue: T) => {
			if (!selectable) {
				onValueChange?.(newValue)
			} else if (shouldClose) {
				enqueue(newValue)
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
		[selectable, shouldClose, toggle, enqueue, onValueChange, close, setQuery, inputRef],
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
	}
}
