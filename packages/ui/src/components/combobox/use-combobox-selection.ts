import { type RefObject, useCallback, useState } from 'react'
import { useDeferredToggle } from '../../hooks/use-deferred-toggle'

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

	const { toggle, enqueue, flushPending } = useDeferredToggle<T>({ multiple, nullable, setValue })

	const select = useCallback(
		(newValue: T) => {
			if (!selectable) {
				onChange?.(newValue)
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
		[selectable, shouldClose, toggle, enqueue, onChange, close, inputRef],
	)

	return { query, setQuery, open, setOpen, editing, setEditing, close, select, flushPending }
}
