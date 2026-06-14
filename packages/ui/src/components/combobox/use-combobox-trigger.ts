'use client'

import { type MouseEvent, type RefObject, useCallback } from 'react'

type ComboboxTriggerParams = {
	open: boolean
	close: () => void
	setOpen: (open: boolean) => void
	inputRef: RefObject<HTMLInputElement | null>
}

/**
 * Mouse-toggle handler for the combobox suffix affordance.
 *
 * @returns `{ onMouseDown }` for the suffix slot: toggles the menu, preventing
 *   default to keep focus on the input. When opening, focuses and selects the
 *   input text so the next keystroke replaces the display.
 * @internal
 */
export function useComboboxTrigger({ open, close, setOpen, inputRef }: ComboboxTriggerParams) {
	const onMouseDown = useCallback(
		(e: MouseEvent<HTMLElement>) => {
			e.preventDefault()

			if (open) {
				close()
			} else {
				inputRef.current?.focus()
				inputRef.current?.select()

				setOpen(true)
			}
		},
		[open, close, setOpen, inputRef],
	)

	return { onMouseDown }
}
