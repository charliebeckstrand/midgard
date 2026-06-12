'use client'

import { type KeyboardEvent, type RefObject, useCallback } from 'react'

const TABBABLE_SELECTOR =
	'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

// Walk-and-match rather than `querySelectorAll(TABBABLE_SELECTOR)`: edge
// handoff rides on first/last, and jsdom's selector engine returns a comma
// list grouped per branch, not in document order.
function getTabbables(root: Element | null): HTMLElement[] {
	if (!root) return []

	return Array.from(root.querySelectorAll<HTMLElement>('*')).filter((el) =>
		el.matches(TABBABLE_SELECTOR),
	)
}

type DatePickerInputTabParams = {
	open: boolean
	/** Reference group: the control wrapping the DateInput and its calendar button. */
	triggerRef: RefObject<HTMLElement | null>
	/** The dialog (floating element) while open. */
	floatingRef: RefObject<HTMLElement | null>
}

/**
 * Closes the Tab cycle for `input` mode while the calendar is open: DateInput
 * → calendar button → dialog content → back to the DateInput. The editable
 * reference group lives outside `FloatingFocusManager`'s modal guards, which
 * only wrap the floating element; without these handlers a Tab from the
 * calendar button walks into the aria-hidden page behind the dialog before
 * re-entering at the footer instead of the toolbar.
 */
export function useDatePickerInputTab({ open, triggerRef, floatingRef }: DatePickerInputTabParams) {
	// On the reference group: forward Tab from its last tabbable (the calendar
	// button) enters the dialog at its first; backward Tab from its first (the
	// DateInput) wraps to the dialog's last.
	const onReferenceKeyDown = useCallback(
		(e: KeyboardEvent<Element>) => {
			if (e.key !== 'Tab' || !open) return

			const group = getTabbables(e.currentTarget)
			const dialog = getTabbables(floatingRef.current)

			if (dialog.length === 0) return

			if (!e.shiftKey && e.target === group[group.length - 1]) {
				e.preventDefault()

				dialog[0]?.focus()
			} else if (e.shiftKey && e.target === group[0]) {
				e.preventDefault()

				dialog[dialog.length - 1]?.focus()
			}
		},
		[open, floatingRef],
	)

	// On the dialog: forward Tab past its last tabbable returns to the
	// DateInput; backward Tab from its first lands on the calendar button.
	const onDialogKeyDown = useCallback(
		(e: KeyboardEvent<Element>) => {
			if (e.key !== 'Tab' || !open) return

			const group = getTabbables(triggerRef.current)
			const dialog = getTabbables(e.currentTarget)

			if (group.length === 0 || dialog.length === 0) return

			if (!e.shiftKey && e.target === dialog[dialog.length - 1]) {
				e.preventDefault()

				group[0]?.focus()
			} else if (e.shiftKey && e.target === dialog[0]) {
				e.preventDefault()

				group[group.length - 1]?.focus()
			}
		},
		[open, triggerRef],
	)

	return { onReferenceKeyDown, onDialogKeyDown }
}
