'use client'

import type { OpenChangeReason } from '@floating-ui/react'
import { type RefObject, useCallback, useId, useRef } from 'react'
import { type FloatingPlacement, useControllableFlag, useFloatingUI } from '../../hooks'
import { useFloatingReference } from '../../hooks/use-floating-reference'

type PickerPopoverOptions = {
	placement: FloatingPlacement
	open?: boolean
	defaultOpen?: boolean
	/** The public callback of the picker. It fires on each open and each close. */
	onOpenChange: ((open: boolean) => void) | undefined
	readOnly: boolean
	/** Marks the bound field touched. Each close calls it. */
	setTouched: () => void
	/** The side effect of the variant on an open. */
	onOpen?: () => void
	/** The side effect of the variant on a close. */
	onClose?: () => void
	/**
	 * The element that gets focus when the dialog closes. Default: `triggerRef`.
	 * The DatePicker `input` mode sets the input, because the first button in the
	 * wrapper is not the field.
	 */
	returnFocusTo?: RefObject<HTMLElement | null>
}

/**
 * The dialog popover that the DatePicker variants and ColorPicker share: the
 * open state, the floating panel, and the dialog id.
 *
 * `readOnly` keeps the trigger focusable and the value submitted, but blocks
 * each open path. A close stays allowed, so that a panel that a caller opened
 * can still dismiss, as in Listbox. A close is the blur of the field, so it
 * marks the field touched, and the rules of `validateOn="touched"` run.
 *
 * The trigger and the panel set their own roles, so floating-ui's `useRole` is
 * off. When it is on, it puts the popup ARIA on the positioning wrapper as well
 * as on the trigger. Then a screen reader finds two controls for one dialog.
 *
 * @returns The {@link useFloatingUI} result, plus `open`, `openPicker`,
 * `closePicker`, `onOpenChange`, `triggerRef`, `setReference`, and `dialogId`.
 * @internal
 */
export function useControlPickerPopover({
	placement,
	open: openProp,
	defaultOpen,
	onOpenChange: onOpenChangeProp,
	readOnly,
	setTouched,
	onOpen,
	onClose,
	returnFocusTo,
}: PickerPopoverOptions) {
	const [open, setOpen] = useControllableFlag({
		value: openProp,
		defaultValue: defaultOpen,
		onValueChange: onOpenChangeProp,
	})

	const openPicker = useCallback(() => {
		if (readOnly) return

		setOpen(true)

		onOpen?.()
	}, [onOpen, readOnly, setOpen])

	const closePicker = useCallback(() => {
		setOpen(false)

		onClose?.()

		setTouched()
	}, [onClose, setOpen, setTouched])

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (nextOpen) openPicker()
			else closePicker()
		},
		[closePicker, openPicker],
	)

	const triggerRef = useRef<HTMLElement | null>(null)

	const floating = useFloatingUI({
		placement,
		open,
		onOpenChange: handleOpenChange,
		offset: 8,
		// A panel taller than the space on its side of the trigger shrinks into that
		// space and scrolls, as a menu does.
		fitHeight: true,
		role: null,
		returnFocusTo: returnFocusTo ?? triggerRef,
	})

	const { context, refs } = floating

	// The panel takes this id, and the trigger names it in `aria-controls`.
	const dialogId = useId()

	const { onOpenChange: engineOpenChange } = context

	// The public open-change entry routes through the floating-ui context. Then a
	// close reason from the caller gets to the focus return in `useFloatingPanel`.
	//
	// The dependency is the handler, not the context that holds it. The engine
	// makes a new `context` at each reposition, but `onOpenChange` keeps one
	// identity for the mount (see `useFloatingOutsidePress`).
	const onOpenChange = useCallback(
		(nextOpen: boolean, event?: Event, reason?: OpenChangeReason) =>
			engineOpenChange(nextOpen, event, reason),
		[engineOpenChange],
	)

	// Captures the trigger in `triggerRef`. The trigger is the default
	// `returnFocusTo`, because `FloatingFocusManager` runs with
	// `returnFocus={false}`. The shared hook never gives `setReference` a `null`
	// during deletion effects (see {@link useFloatingReference}).
	const setReference = useFloatingReference<HTMLElement>(refs.setReference, triggerRef, undefined)

	return {
		...floating,
		open,
		openPicker,
		closePicker,
		onOpenChange,
		triggerRef,
		setReference,
		dialogId,
	}
}
