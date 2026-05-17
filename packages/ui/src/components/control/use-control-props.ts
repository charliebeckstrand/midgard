'use client'

import { useControl } from './context'

type FieldBinding = {
	invalid?: boolean
}

export type UseControlPropsInput = {
	id?: string
	autoComplete?: string
	disabled?: boolean
	required?: boolean
	readOnly?: boolean
	/**
	 * Form binding (from `useFormText` / `useFormToggle`). Its `invalid` flag is
	 * OR'd with the Control context's `invalid` so an external form error and
	 * an ambient `<Field invalid>` both surface.
	 */
	binding?: FieldBinding
}

export type UseControlPropsResult = {
	id: string | undefined
	autoComplete: string | undefined
	disabled: boolean | undefined
	required: boolean | undefined
	readOnly: boolean | undefined
	invalid: boolean | undefined
}

/**
 * Resolves the form-field props that all members of the Control cascade share:
 * id, autoComplete, disabled, required, readOnly, invalid.
 *
 * Resolution order: explicit input wins, then the wrapping `<Control>` /
 * `<Field>` context. `invalid` additionally OR's with the form binding's
 * invalid flag.
 *
 * Size is **not** resolved here — every field reads `useDensity()` directly
 * (input / textarea / switch / etc. compose `size ?? control?.size` against
 * the Density cascade at the call site).
 *
 * @example
 *   const { id, disabled, required, invalid } = useControlProps({
 *     id: idProp, disabled: disabledProp, required: requiredProp, binding,
 *   })
 */
export function useControlProps(input: UseControlPropsInput = {}): UseControlPropsResult {
	const control = useControl()

	return {
		id: input.id ?? control?.id,
		autoComplete: input.autoComplete ?? control?.autoComplete,
		disabled: input.disabled ?? control?.disabled,
		required: input.required ?? control?.required,
		readOnly: input.readOnly ?? control?.readOnly,
		invalid: control?.invalid || input.binding?.invalid,
	}
}
