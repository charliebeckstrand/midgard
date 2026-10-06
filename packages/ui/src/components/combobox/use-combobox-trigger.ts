'use client'

import { type MouseEvent, type RefObject, useCallback } from 'react'

type ComboboxTriggerParams = {
	open: boolean
	close: () => void
	setOpen: (open: boolean) => void
	inputRef: RefObject<HTMLInputElement | null>
	/**
	 * Reads the lock of the combobox when a press occurs. A locked press does
	 * nothing: it does not toggle the menu, and it does not prevent the default.
	 */
	isLocked?: () => boolean
}

/**
 * Mouse-toggle handler for the combobox suffix affordance.
 *
 * @returns `{ onMouseDown, onFrameMouseDown }`. `onMouseDown` is for the suffix
 *   slot: it toggles the menu, and prevents the default to keep focus on the
 *   input. When it opens the menu, it focuses the input and selects its text, so
 *   the next keystroke replaces the display. `onFrameMouseDown` is for the
 *   control frame: it does the same for a press on the frame itself, and
 *   ignores a press on a child, which keeps its own handler.
 * @internal
 */
export function useComboboxTrigger({
	open,
	close,
	setOpen,
	inputRef,
	isLocked,
}: ComboboxTriggerParams) {
	const onMouseDown = useCallback(
		(event: MouseEvent<HTMLElement>) => {
			if (isLocked?.()) return

			event.preventDefault()

			if (open) {
				close()
			} else {
				inputRef.current?.focus()
				inputRef.current?.select()

				setOpen(true)
			}
		},
		[open, close, setOpen, inputRef, isLocked],
	)

	const onFrameMouseDown = useCallback(
		(event: MouseEvent<HTMLElement>) => {
			if (event.target === event.currentTarget) onMouseDown(event)
		},
		[onMouseDown],
	)

	return { onMouseDown, onFrameMouseDown }
}
