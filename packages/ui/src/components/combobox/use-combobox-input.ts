'use client'

import {
	type ChangeEvent,
	type FocusEvent,
	type KeyboardEvent,
	type KeyboardEventHandler,
	type RefObject,
	useCallback,
} from 'react'
import { selectSoleOption } from './combobox-utilities'

type ComboboxInputParams<T> = {
	value: T | T[] | undefined
	multiple: boolean
	clearOnEmpty: boolean
	floatingRef: RefObject<HTMLElement | null>
	optionsRef: RefObject<HTMLDivElement | null>
	setValue: (value: T | T[] | undefined) => void
	setEditing: (editing: boolean) => void
	setQuery: (query: string) => void
	setOpen: (open: boolean) => void
	close: () => void
	keyboardSettled: (cb: () => void) => void
	rovingKeyDown: KeyboardEventHandler<HTMLInputElement>
}

export function useComboboxInput<T>({
	value,
	multiple,
	clearOnEmpty,
	floatingRef,
	optionsRef,
	setValue,
	setEditing,
	setQuery,
	setOpen,
	close,
	keyboardSettled,
	rovingKeyDown,
}: ComboboxInputParams<T>) {
	const onChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			const next = e.target.value

			setEditing(true)

			setQuery(next)

			setOpen(true)

			if (clearOnEmpty && next === '' && !multiple && value !== undefined) {
				setValue(undefined)
			}
		},
		[clearOnEmpty, multiple, value, setEditing, setQuery, setOpen, setValue],
	)

	const onFocus = useCallback(() => {
		keyboardSettled(() => setOpen(true))
	}, [setOpen, keyboardSettled])

	const onBlur = useCallback(
		(e: FocusEvent<HTMLInputElement>) => {
			const floating = floatingRef.current

			if (floating?.contains(e.relatedTarget as Node)) return

			close()
		},
		[close, floatingRef],
	)

	const onKeyDown = useCallback(
		(e: KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Escape') {
				close()

				return
			}

			if (e.key === 'Enter') {
				const container = optionsRef.current

				if (container && selectSoleOption(container)) {
					e.preventDefault()

					return
				}
			}

			// Home/End belong to the editable textbox — let them move the caret
			// rather than routing to roving, which would preventDefault the caret
			// jump and snap to the first/last option instead.
			if (e.key === 'Home' || e.key === 'End') return

			rovingKeyDown(e)
		},
		[close, optionsRef, rovingKeyDown],
	)

	return { onChange, onFocus, onBlur, onKeyDown }
}
