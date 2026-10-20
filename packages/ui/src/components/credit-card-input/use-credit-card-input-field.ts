'use client'

import type { FocusEventHandler, Ref } from 'react'
import { composeEventHandlers } from '../../core'
import { isDecimalDigit } from '../../utilities/caret'
import { useControlLabelRef } from '../control/use-control-label-ref'
import { useMaskInput } from '../mask-input/use-mask-input'

type CreditCardInputFieldOptions = {
	/** The default `aria-label`. See {@link useControlLabelRef}. */
	fallbackLabel: string
	/** The `aria-label` of the caller, which wins over `fallbackLabel`. */
	ariaLabel: string | undefined
	ref: Ref<HTMLInputElement> | undefined
	name: string | undefined
	value: string | null | undefined
	defaultValue: string | undefined
	onValueChange: ((value: string) => void) | undefined
	/** Masks the raw text of the field. */
	format: (raw: string) => string
	/** The `onBlur` of the caller. */
	onBlur: FocusEventHandler<HTMLInputElement> | undefined
}

/**
 * The shared wiring of the card fields: the `aria-label` with the input ref
 * ({@link useControlLabelRef}), the digit mask, and the blur that marks the
 * field touched.
 *
 * @remarks
 * The returned `onBlur` runs the handler of the caller first. The touched mark
 * runs also when that handler calls `preventDefault()` (CONVENTIONS.md §3.9).
 * @returns The return of `useMaskInput`, with the composed `onBlur` and the
 * resolved `ariaLabel`.
 * @internal
 */
export function useCreditCardInputField({
	fallbackLabel,
	ariaLabel,
	ref,
	name,
	value,
	defaultValue,
	onValueChange,
	format,
	onBlur,
}: CreditCardInputFieldOptions) {
	const labelled = useControlLabelRef(fallbackLabel, ref, ariaLabel)

	const mask = useMaskInput({
		name,
		value,
		defaultValue,
		onChange: onValueChange,
		format,
		meaningful: isDecimalDigit,
		ref: labelled.ref,
	})

	return {
		...mask,
		ariaLabel: labelled.ariaLabel,
		onBlur: composeEventHandlers(onBlur, () => mask.onBlur(), { checkForDefaultPrevented: false }),
	}
}
