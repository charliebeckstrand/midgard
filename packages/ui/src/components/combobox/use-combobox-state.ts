import { type RefObject, useCallback, useState } from 'react'
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

	return { query, setQuery, open, setOpen, editing, setEditing, close, select, flushPending }
}
