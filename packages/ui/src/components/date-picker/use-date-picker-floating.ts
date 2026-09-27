'use client'

import type { OpenChangeReason } from '@floating-ui/react'
import { type RefObject, useCallback } from 'react'
import { type FloatingUIOptions, useFloatingUI } from '../../hooks'
import { useFloatingReference } from '../../hooks/use-floating-reference'

type DatePickerFloatingOptions = {
	placement: FloatingUIOptions['placement']
	open: boolean
	/** The side-effect handler of the variant: its open and close paths. */
	onOpenChange: (open: boolean) => void
	triggerRef: RefObject<HTMLElement | null>
}

/**
 * The dialog popover that the three DatePicker variants share.
 *
 * It wraps {@link useFloatingUI} with the dialog role and the picker offset.
 * It also gives the public open-change entry and the trigger ref callback.
 *
 * @returns The {@link useFloatingUI} result, plus `onOpenChange` and `setReference`.
 * @internal
 */
export function useDatePickerFloating({
	placement,
	open,
	onOpenChange: handleOpenChange,
	triggerRef,
}: DatePickerFloatingOptions) {
	const floating = useFloatingUI({
		placement,
		open,
		onOpenChange: handleOpenChange,
		offset: 8,
		role: 'dialog',
		returnFocusTo: triggerRef,
	})

	const { context, refs } = floating

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

	// Captures the trigger for `returnFocusTo`, because `FloatingFocusManager` runs
	// with `returnFocus={false}`. The shared hook never gives `setReference` a
	// `null` during deletion effects (see {@link useFloatingReference}).
	const setReference = useFloatingReference<HTMLElement>(refs.setReference, triggerRef, undefined)

	return { ...floating, onOpenChange, setReference }
}
