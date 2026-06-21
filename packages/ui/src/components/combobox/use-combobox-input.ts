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
	/** Current menu open state; a closed menu has no options for the roving handler to navigate. */
	open: boolean
	setValue: (value: T | T[] | undefined) => void
	setEditing: (editing: boolean) => void
	setQuery: (query: string) => void
	setOpen: (open: boolean) => void
	/** Opens the closed menu from an arrow key; the root seats the highlight on any selection. */
	openByArrowKey: () => void
	close: () => void
	/** Fires when focus leaves the combobox entirely; binds Form touched state. */
	onTouched?: () => void
	keyboardSettled: (cb: () => void) => void
	rovingKeyDown: KeyboardEventHandler<HTMLInputElement>
}

/**
 * Keys the editable textbox owns natively: Home/End move the caret and
 * Shift+Arrow extends the text selection. Routed to the roving handler they
 * would `preventDefault` and snap the menu highlight to the first/last option
 * instead.
 */
function isReservedTextboxKey(event: KeyboardEvent<HTMLInputElement>): boolean {
	if (event.key === 'Home' || event.key === 'End') return true

	return event.shiftKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')
}

/**
 * Whether an arrow key should open the closed menu rather than move the caret.
 * The menu opens only from the far edge of the text in the key's direction —
 * ArrowDown at the end, ArrowUp at the start — so a mid-value caret or a ranged
 * selection travels to that edge natively first, as in a plain textbox, and the
 * next press opens. With no caret to traverse — an empty value or a selectionless
 * input type — either key opens immediately.
 */
function arrowOpensClosedMenu(event: KeyboardEvent<HTMLInputElement>): boolean {
	const { selectionStart, selectionEnd, value } = event.currentTarget

	if (selectionStart === null || selectionEnd === null || value === '') return true

	if (selectionStart !== selectionEnd) return false

	return event.key === 'ArrowDown' ? selectionEnd === value.length : selectionStart === 0
}

/**
 * Event handlers for the combobox input element.
 *
 * @returns `{ onChange, onFocus, onBlur, onKeyDown }` for the input. `onChange`
 *   enters editing mode, updates the query, opens the menu, and clears the value
 *   on empty when `clearOnEmpty`. `onFocus` opens once the keyboard has settled.
 *   `onBlur` ignores focus moving into the floating panel, else marks touched and
 *   closes. `onKeyDown` handles Escape/Enter, reserves Home/End and Shift+Arrow
 *   for native caret/selection, opens the closed menu from an arrow key at the
 *   matching text edge (ArrowDown at the end, ArrowUp at the start), then
 *   delegates to the roving handler.
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
	open,
	setValue,
	setEditing,
	setQuery,
	setOpen,
	openByArrowKey,
	close,
	onTouched,
	keyboardSettled,
	rovingKeyDown,
}: ComboboxInputParams<T>) {
	const onChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			const next = event.target.value

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
		(event: FocusEvent<HTMLInputElement>) => {
			const floating = floatingRef.current

			if (floating?.contains(event.relatedTarget as Node)) return

			onTouched?.()

			close()
		},
		[close, floatingRef, onTouched],
	)

	const onKeyDown = useCallback(
		(event: KeyboardEvent<HTMLInputElement>) => {
			if (event.key === 'Escape') {
				close()

				return
			}

			if (event.key === 'Enter') {
				const container = optionsRef.current

				if (container && selectSoleOption(container)) {
					event.preventDefault()

					return
				}
			}

			// Home/End and Shift+Arrow belong to the editable textbox (caret and
			// text selection); the roving handler would preventDefault and move the
			// menu highlight instead.
			if (isReservedTextboxKey(event)) return

			// A closed menu holds no options for the roving handler, so an arrow key
			// opens it (APG editable combobox), matching the focus and chevron open
			// paths; arrowOpensClosedMenu gates this on caret position. The root then
			// seats the highlight on any current selection, else a second press
			// highlights the first option. preventDefault holds the caret, as roving
			// navigation does.
			if (
				!open &&
				(event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
				arrowOpensClosedMenu(event)
			) {
				event.preventDefault()

				openByArrowKey()

				return
			}

			rovingKeyDown(event)
		},
		[close, open, openByArrowKey, optionsRef, rovingKeyDown],
	)

	return { onChange, onFocus, onBlur, onKeyDown }
}
