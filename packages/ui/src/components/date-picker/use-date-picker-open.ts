'use client'

import { useCallback, useRef } from 'react'
import { useControllableFlag } from '../../hooks'

type DatePickerOpenOptions = {
	open: boolean | undefined
	defaultOpen: boolean | undefined
	onOpenChange: ((open: boolean) => void) | undefined
	readOnly: boolean
}

/**
 * The open state that the three DatePicker variants share, with its trigger ref.
 *
 * `readOnly` keeps the trigger focusable and the value submitted, but blocks
 * every open path. A close stays allowed, so that a calendar that a caller
 * opened can still dismiss, as in Listbox.
 *
 * @returns `{ open, setOpen, triggerRef }`. `setOpen` applies the `readOnly` gate.
 * @internal
 */
export function useDatePickerOpen({
	open: openProp,
	defaultOpen,
	onOpenChange,
	readOnly,
}: DatePickerOpenOptions) {
	const [open, setOpenInner] = useControllableFlag({
		value: openProp,
		defaultValue: defaultOpen,
		onValueChange: onOpenChange,
	})

	const setOpen = useCallback(
		(next: boolean) => {
			if (readOnly && next) return

			setOpenInner(next)
		},
		[readOnly, setOpenInner],
	)

	const triggerRef = useRef<HTMLElement | null>(null)

	return { open, setOpen, triggerRef }
}
