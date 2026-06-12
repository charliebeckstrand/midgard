'use client'

import { useAriaIds } from '../../hooks'
import { useControl } from './context'

export type ControlPropsOptions = {
	id?: string
	autoComplete?: string
	disabled?: boolean
	required?: boolean
	readOnly?: boolean
	/** Consumer-supplied `aria-describedby`, merged ahead of the field's own ids. */
	'aria-describedby'?: string
	/**
	 * Form-bound invalid state (from `useInputValue` / `useFormValue` /
	 * `useFormToggle`); OR's with the Control context's `invalid` so an
	 * external form error and an ambient `<Field invalid>` both surface.
	 */
	invalid?: boolean
}

export type ControlPropsResult = {
	id: string | undefined
	autoComplete: string | undefined
	disabled: boolean | undefined
	required: boolean | undefined
	readOnly: boolean | undefined
	invalid: boolean | undefined
	'aria-describedby': string | undefined
}

/**
 * Resolves the form-field props that all members of the Control cascade share:
 * id, autoComplete, disabled, required, readOnly, invalid.
 *
 * Resolution order: explicit input wins, then the wrapping `<Control>` /
 * `<Field>` context. `invalid` instead OR's the form-bound flag with the
 * context's.
 *
 * Does **not** resolve size; every field reads `useDensity()` directly
 * (input / textarea / switch / etc. compose `size ?? control?.size` against
 * the Density cascade at the call site).
 *
 * @example
 *   const { id, disabled, required, invalid } = useControlProps({
 *     id: idProp, disabled: disabledProp, required: requiredProp, invalid,
 *   })
 */
export function useControlProps(input: ControlPropsOptions = {}): ControlPropsResult {
	const control = useControl()

	// Consumer-supplied ids first, then the field's registered description /
	// error ids. Omitted when neither is present.
	const describedBy = useAriaIds(input['aria-describedby'], control?.describedBy)

	return {
		id: input.id ?? control?.id,
		autoComplete: input.autoComplete ?? control?.autoComplete,
		disabled: input.disabled ?? control?.disabled,
		required: input.required ?? control?.required,
		readOnly: input.readOnly ?? control?.readOnly,
		// A mounted error Message marks the control invalid even without a form
		// binding.
		invalid: control?.invalid || input.invalid || control?.messageRegistered || undefined,
		'aria-describedby': describedBy,
	}
}
