import { type RefObject, useCallback, useRef, useState } from 'react'
import { useSelect } from '../../hooks/use-select'

type UseComboboxSelectionParams<T> = {
	multiple: boolean
	nullable: boolean
	selectable: boolean
	closeOnSelect?: boolean
	onChange?: (value: T) => void
	setValue: (
		value: T | T[] | undefined | ((prev: T | T[] | undefined) => T | T[] | undefined),
	) => void
	inputRef: RefObject<HTMLInputElement | null>
}

export function useComboboxSelection<T>({
	multiple,
	nullable,
	selectable,
	closeOnSelect,
	onChange,
	setValue,
	inputRef,
}: UseComboboxSelectionParams<T>) {
	const [query, setQuery] = useState('')

	const [open, setOpen] = useState(false)

	const [editing, setEditing] = useState(false)

	const close = useCallback(() => {
		setOpen(false)

		setQuery('')

		setEditing(false)
	}, [])

	const shouldClose = closeOnSelect ?? !multiple

	const toggle = useSelect({ multiple, nullable, setValue })

	const pendingRef = useRef<{ value: T } | null>(null)

	const select = useCallback(
		(newValue: T) => {
			if (!selectable) {
				onChange?.(newValue)
			} else if (shouldClose) {
				pendingRef.current = { value: newValue }
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
		[selectable, shouldClose, toggle, onChange, close, inputRef],
	)

	const flushPending = useCallback(() => {
		if (pendingRef.current) {
			toggle(pendingRef.current.value)

			pendingRef.current = null
		}
	}, [toggle])

	return { query, setQuery, open, setOpen, editing, setEditing, close, select, flushPending }
}
