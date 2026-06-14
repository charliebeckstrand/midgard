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
	/** Fires when focus leaves the combobox entirely; binds Form touched state. */
	onTouched?: () => void
	keyboardSettled: (cb: () => void) => void
	rovingKeyDown: KeyboardEventHandler<HTMLInputElement>
}

/**
 * Event handlers for the combobox input element.
 *
 * @returns `{ onChange, onFocus, onBlur, onKeyDown }` for the input. `onChange`
 *   enters editing mode, updates the query, opens the menu, and clears the value
 *   on empty when `clearOnEmpty`. `onFocus` opens once the keyboard has settled.
 *   `onBlur` ignores focus moving into the floating panel, else marks touched and
 *   closes. `onKeyDown` handles Escape/Enter, reserves Home/End and Shift+Arrow
 *   for native caret/selection, then delegates to the roving handler.
 * @remarks Enter selects the sole remaining option when the list has narrowed to
 *   one; the roving handler's activation key selects the highlighted option.
 * @internal
 */
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
	onTouched,
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

			onTouched?.()

			close()
		},
		[close, floatingRef, onTouched],
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

			// Home/End belong to the editable textbox and move the caret; routed
			// to roving they would preventDefault and snap to the first/last
			// option.
			if (e.key === 'Home' || e.key === 'End') return

			// Shift+Arrow extends the input's text selection; the roving
			// handler would preventDefault and move the menu highlight
			// instead.
			if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) return

			rovingKeyDown(e)
		},
		[close, optionsRef, rovingKeyDown],
	)

	return { onChange, onFocus, onBlur, onKeyDown }
}
