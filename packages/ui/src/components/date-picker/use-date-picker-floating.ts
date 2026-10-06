'use client'

import type { OpenChangeReason } from '@floating-ui/react'
import { type RefObject, useCallback, useId } from 'react'
import { type FloatingUIOptions, useFloatingUI } from '../../hooks'
import { useFloatingReference } from '../../hooks/use-floating-reference'

type DatePickerFloatingOptions = {
	placement: FloatingUIOptions['placement']
	open: boolean
	/** The side-effect handler of the variant: its open and close paths. */
	onOpenChange: (open: boolean) => void
	triggerRef: RefObject<HTMLElement | null>
	/**
	 * The element that gets focus when the dialog closes. Default: `triggerRef`.
	 * The `input` mode sets the input, because the first button in the wrapper is
	 * not the field.
	 */
	returnFocusTo?: RefObject<HTMLElement | null>
}

/**
 * The dialog popover that the three DatePicker variants share.
 *
 * It wraps {@link useFloatingUI} with the picker offset. It also gives the
 * public open-change entry, the trigger ref callback, and the dialog id.
 *
 * The trigger and the panel set their own roles, so floating-ui's `useRole` is
 * off. When it is on, it puts the popup ARIA on the positioning wrapper as well
 * as on the trigger. Then a screen reader finds two controls for one dialog.
 *
 * @returns The {@link useFloatingUI} result, plus `onOpenChange`, `setReference`, and `dialogId`.
 * @internal
 */
export function useDatePickerFloating({
	placement,
	open,
	onOpenChange: handleOpenChange,
	triggerRef,
	returnFocusTo,
}: DatePickerFloatingOptions) {
	const floating = useFloatingUI({
		placement,
		open,
		onOpenChange: handleOpenChange,
		offset: 8,
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

	return { ...floating, onOpenChange, setReference, dialogId }
}
