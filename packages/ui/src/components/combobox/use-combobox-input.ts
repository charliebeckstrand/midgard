'use client'

import {
	type ChangeEvent,
	type ClipboardEvent,
	type ClipboardEventHandler,
	type FocusEvent,
	type KeyboardEvent,
	type KeyboardEventHandler,
	type MouseEvent,
	type RefObject,
	type UIEvent,
	useCallback,
} from 'react'
import { isComposing } from '../../utilities'
import { enterKeepsSelection, selectSoleOption } from './combobox-utilities'

type ComboboxInputParams<T> = {
	value: T | T[] | undefined
	multiple: boolean
	clearOnEmpty: boolean
	floatingRef: RefObject<HTMLElement | null>
	optionsRef: RefObject<HTMLDivElement | null>
	/**
	 * Current menu open state. A closed menu sends no key to the roving handler or to the
	 * sole-option Enter. Its rows can stay mounted while the panel animates out.
	 */
	open: boolean
	/** True while the combobox is read-only or disabled. A paste then skips the consumer's handler. */
	locked?: boolean
	setValue: (value: T | T[] | undefined) => void
	setEditing: (editing: boolean) => void
	setQuery: (query: string) => void
	setOpen: (open: boolean) => void
	/** Opens the closed menu from an arrow key; the root seats the highlight on any selection. */
	openByArrowKey: () => void
	close: () => void
	/**
	 * Ends a pick with no change to the value, as `select` ends one: it closes the
	 * menu, or with `closeOnSelect` off it resets the query and keeps the menu open.
	 * Enter on an option that is already selected calls it in single mode.
	 */
	keep: () => void
	/** Fires when focus leaves the combobox entirely; binds Form touched state. */
	onTouched?: () => void
	keyboardSettled: (cb: () => void) => void
	rovingKeyDown: KeyboardEventHandler<HTMLInputElement>
	/** The consumer's paste handler — see {@link ComboboxBaseProps.onPaste}. */
	onPaste?: ClipboardEventHandler<HTMLInputElement>
}

/**
 * Keys the editable textbox owns natively: Home/End move the caret and
 * Shift+Arrow extends the text selection. Routed to the roving handler they
 * would `preventDefault` and snap the menu highlight to the first/last option
 * instead. Every key of an IME composition also belongs to the textbox: the
 * IME uses Enter to confirm the composition, Escape to cancel it, and the
 * arrows to pick a candidate. Shared with the command palette's search textbox.
 *
 * @internal
 */
export function isReservedTextboxKey(event: KeyboardEvent<HTMLInputElement>): boolean {
	if (isComposing(event)) return true

	if (event.key === 'Home' || event.key === 'End') return true

	return event.shiftKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')
}

/**
 * Whether an arrow key opens the closed menu rather than move the caret.
 * The menu opens only from the far edge of the text in the key's direction:
 * ArrowDown at the end, ArrowUp at the start. A mid-value caret or a ranged
 * selection therefore travels to that edge natively first, as in a plain
 * textbox, and the next press opens. With no caret to traverse — an empty value, or an element
 * reporting a null selection — either key opens immediately.
 *
 * @remarks
 * The null-selection arm is defensive rather than reachable: the combobox input
 * is always `type="text"`, which always reports a selection. It is the hook's
 * pinned contract (`use-combobox-input.test.ts`), so it stays.
 */
function arrowOpensClosedMenu(event: KeyboardEvent<HTMLInputElement>): boolean {
	const { selectionStart, selectionEnd, value } = event.currentTarget

	if (selectionStart === null || selectionEnd === null || value === '') return true

	if (selectionStart !== selectionEnd) return false

	return event.key === 'ArrowDown' ? selectionEnd === value.length : selectionStart === 0
}

/**
 * Handles a key on the closed menu. The panel keeps its rows mounted while it
 * animates out, and a row can keep `data-active`. No key of a closed menu goes
 * to the rows, because Enter or the roving handler would pick or move one.
 *
 * An arrow key at the text edge opens the menu, as the focus and chevron paths
 * do (APG editable combobox). The root then seats the highlight on any current
 * selection, else a second press highlights the first option. `preventDefault`
 * holds the caret, as roving navigation does. Each other key stays with the
 * textbox.
 */
function closedMenuKeyDown(
	event: KeyboardEvent<HTMLInputElement>,
	openByArrowKey: () => void,
): void {
	if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

	if (!arrowOpensClosedMenu(event)) return

	event.preventDefault()

	openByArrowKey()
}

/**
 * Handles an Enter on the open menu before the roving handler gets it. The
 * Enter selects the sole option of a list that has narrowed to one. Enter
 * chooses, and in single mode a choice of the selected option keeps it. The
 * roving handler would click that option, and the click clears a `nullable`
 * value. Thus the Enter clicks nothing and calls `keep`, which ends the pick as
 * `closeOnSelect` sets.
 *
 * @returns `true` when the function used the key, else `false`.
 */
function openMenuEnter(
	event: KeyboardEvent<HTMLInputElement>,
	container: HTMLElement | null,
	multiple: boolean,
	keep: () => void,
): boolean {
	if (event.key !== 'Enter' || !container) return false

	if (enterKeepsSelection(container, multiple)) {
		event.preventDefault()

		keep()

		return true
	}

	if (!selectSoleOption(container)) return false

	event.preventDefault()

	return true
}

/**
 * Event handlers for the combobox input element.
 *
 * @returns `{ onChange, onFocus, onMouseDown, onBlur, onKeyDown, onPaste, onScroll }` for the
 *   input. `onChange` enters editing mode, updates the query, opens the menu, and
 *   clears the value on empty when `clearOnEmpty`. `onFocus` opens once the
 *   keyboard has settled. `onMouseDown` does the same for a press on the input
 *   when it already has focus. The `onFocus` open runs only if the input still
 *   has focus when the keyboard settles. `onBlur` ignores focus moving into the floating
 *   panel, else marks touched and closes. `onKeyDown` handles Escape/Enter, and reserves Home/End and
 *   Shift+Arrow for native caret/selection. It opens the closed menu from an
 *   arrow key at the matching text edge: ArrowDown at the end, ArrowUp at the
 *   start. It gives no other key of a closed menu to the rows. On an open menu,
 *   it delegates to the roving handler. `onScroll` holds an unfocused
 *   input at its start, so a truncated value does not scroll sideways.
 * @remarks On an open menu, Enter selects the sole remaining option when the list
 *   has narrowed to one. The activation key of the roving handler selects the
 *   highlighted option. In single mode, Enter on an option that is already
 *   selected clicks nothing. It calls `keep`, which keeps the value and ends
 *   the pick as `closeOnSelect` sets, so no Enter clears a `nullable` value.
 * @internal
 */
export function useComboboxInput<T>({
	value,
	multiple,
	clearOnEmpty,
	floatingRef,
	optionsRef,
	open,
	locked,
	setValue,
	setEditing,
	setQuery,
	setOpen,
	openByArrowKey,
	close,
	keep,
	onTouched,
	keyboardSettled,
	rovingKeyDown,
	onPaste,
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

	// On a touch device the open waits until the keyboard settles, up to about a second.
	// A blur in that time does not cancel the wait, so the open runs only if the input
	// still has focus. Without this check, the late open shows a menu that no later
	// blur closes.
	const onFocus = useCallback(
		(event: FocusEvent<HTMLInputElement>) => {
			const input = event.currentTarget

			keyboardSettled(() => {
				if (document.activeElement === input) setOpen(true)
			})
		},
		[setOpen, keyboardSettled],
	)

	// A press on the input when it already has focus. No focus event fires for it, so
	// `onFocus` cannot open the menu. That is the state after a pick or an Escape, which
	// close the menu but keep focus on the input. A press on an unfocused input stays
	// with `onFocus`, which runs next and waits for the keyboard.
	const onMouseDown = useCallback(
		(event: MouseEvent<HTMLInputElement>) => {
			if (open || document.activeElement !== event.currentTarget) return

			keyboardSettled(() => setOpen(true))
		},
		[open, setOpen, keyboardSettled],
	)

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
			// Home/End, Shift+Arrow and the keys of an IME composition belong to the
			// editable textbox. The roving handler would preventDefault and move the
			// menu highlight instead, and Escape or Enter would close the menu or pick
			// an option.
			if (isReservedTextboxKey(event)) return

			if (event.key === 'Escape') {
				// The press closes only the menu, so the escape layer of a surface
				// around the combobox must ignore it. In a browser the layer of the
				// menu can unregister before the document listener runs, so the
				// dismiss stack alone does not stop the press. An Escape on the
				// closed menu stays with the surface around it.
				if (open) event.preventDefault()

				close()

				return
			}

			// A closed menu gives no key to its rows, which can stay mounted while the
			// panel animates out. Only an arrow key at the text edge acts: it opens.
			if (!open) {
				closedMenuKeyDown(event, openByArrowKey)

				return
			}

			if (openMenuEnter(event, optionsRef.current, multiple, keep)) return

			rovingKeyDown(event)
		},
		[close, keep, multiple, open, openByArrowKey, optionsRef, rovingKeyDown],
	)

	/*
	 * A paste, offered to the consumer first.
	 *
	 * When the handler takes it, the draft that paste replaced is dropped and editing ends, exactly as
	 * selecting an option does. Taking it means `preventDefault`: the handler read the clipboard itself
	 * and turned it into a selection. Without that the field kept the half-typed text it had just
	 * committed over. It was still `editing`, so the resting display stayed suppressed by a query the
	 * consumer had already consumed. Any placeholder standing in for that display stayed suppressed too.
	 *
	 * A paste the handler leaves alone is ordinary typing and falls through to `onChange`.
	 *
	 * A read-only input still takes a paste event, so a locked combobox skips the handler. Otherwise
	 * the handler commits the pasted values, which the lock forbids.
	 */
	const onPasteHandler = useCallback(
		(event: ClipboardEvent<HTMLInputElement>) => {
			if (locked) return

			onPaste?.(event)

			if (!event.defaultPrevented) return

			setQuery('')

			setEditing(false)
		},
		[locked, onPaste, setQuery, setEditing],
	)

	/*
	 * A sideways wheel or trackpad gesture scrolls a text input, also when it does not have focus.
	 * A resting value that truncates then scrolls away from its ellipsis. The field shows the middle
	 * of the value, with blank space past its end. No CSS stops it, because `overflow` does not reach
	 * the inner text box of an `<input>`. This handler puts the unfocused input back at its start.
	 * The browser fires `scroll` before it paints, so the moved text never shows.
	 *
	 * A focused input keeps its scroll. There the caret moves the text, as Home, End, and typing do.
	 */
	const onScroll = useCallback((event: UIEvent<HTMLInputElement>) => {
		const input = event.currentTarget

		if (document.activeElement === input) return

		input.scrollLeft = 0
	}, [])

	return {
		onChange,
		onFocus,
		onMouseDown,
		onBlur,
		onKeyDown,
		onPaste: onPasteHandler,
		onScroll,
	}
}
