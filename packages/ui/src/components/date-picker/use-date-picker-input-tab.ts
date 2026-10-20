'use client'

import { type KeyboardEvent, type RefObject, useCallback } from 'react'
import { getTabbableElements } from '../../utilities/focusable-selector'

/** Options for {@link useDatePickerInputTab}. @internal */
type DatePickerInputTabParams = {
	open: boolean
	/** Reference group: the control wrapping the DateInput and its calendar button. */
	triggerRef: RefObject<HTMLElement | null>
	/** The dialog (floating element) while open. */
	floatingRef: RefObject<HTMLElement | null>
}

/**
 * Moves a Tab at an edge of `from` into `to`: a forward Tab from the last
 * tabbable of `from` goes to the first of `to`, and a backward Tab from the
 * first of `from` goes to the last of `to`. Other keys and Tabs pass.
 *
 * @internal
 */
function wrapTab(event: KeyboardEvent<Element>, from: Element, to: Element | null): void {
	if (event.key !== 'Tab') return

	const source = getTabbableElements(from)
	const target = getTabbableElements(to)

	const edge = event.shiftKey ? source[0] : source.at(-1)

	if (target.length === 0 || event.target !== edge) return

	event.preventDefault()

	;(event.shiftKey ? target.at(-1) : target[0])?.focus()
}

/**
 * Closes the Tab cycle for `input` mode while the calendar is open: DateInput
 * → calendar button → dialog content → back to the DateInput. The editable
 * reference group lives outside `FloatingFocusManager`'s modal guards, which
 * only wrap the floating element. Without these handlers a Tab from the
 * calendar button walks into the aria-hidden page behind the dialog. It then
 * re-enters at the footer instead of the toolbar.
 *
 * @returns `onReferenceKeyDown` for the reference group and `onDialogKeyDown`
 * for the floating dialog. Both no-op unless the calendar is open and the Tab
 * lands on a wrap edge.
 */
export function useDatePickerInputTab({ open, triggerRef, floatingRef }: DatePickerInputTabParams) {
	// On the reference group: forward Tab from its last tabbable (the calendar
	// button) enters the dialog at its first; backward Tab from its first (the
	// DateInput) wraps to the dialog's last.
	const onReferenceKeyDown = useCallback(
		(event: KeyboardEvent<Element>) => {
			if (open) wrapTab(event, event.currentTarget, floatingRef.current)
		},
		[open, floatingRef],
	)

	// On the dialog: forward Tab past its last tabbable returns to the
	// DateInput; backward Tab from its first lands on the calendar button.
	const onDialogKeyDown = useCallback(
		(event: KeyboardEvent<Element>) => {
			if (open) wrapTab(event, event.currentTarget, triggerRef.current)
		},
		[open, triggerRef],
	)

	return { onReferenceKeyDown, onDialogKeyDown }
}
