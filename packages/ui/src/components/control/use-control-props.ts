'use client'

import { type ValidationAttrs, validationAttrs } from '../../core'
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
	/** Spreadable `data-*` / `aria-invalid` attributes for the resolved validation state: `error`/invalid, else the Control `severity` (`warning` / `success`), else none. */
	validation: ValidationAttrs
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
 * @param input - Explicit control props from the field; each wins over the
 * context value of the same name, except `invalid` (OR-merged) and
 * `aria-describedby` (merged ahead of the field's own ids).
 * @returns The resolved `id`, `autoComplete`, `disabled`, `required`,
 * `readOnly`, `invalid`, and composed `aria-describedby`; any field is
 * `undefined` when neither input nor context supplies it.
 * @remarks `invalid` resolves `true` from an explicit `invalid` (prop, ambient
 * `<Control invalid>`, or form binding) or when the Control `severity` is
 * `error`; a nested `<Message>` is presentational and never marks the control
 * invalid. `validation` collapses the resolved state into a single spreadable
 * attribute object — invalid wins, then a `warning` / `success` severity — so
 * the three validation rings stay mutually exclusive.
 * @see {@link useControlToggle} for the Density-aware variant.
 * @example
 *   const { id, disabled, required, invalid, validation } = useControlProps({
 *     id: idProp, disabled: disabledProp, required: requiredProp, invalid,
 *   })
 */
export function useControlProps(input: ControlPropsOptions = {}): ControlPropsResult {
	const control = useControl()

	// Consumer-supplied ids first, then the field's registered description /
	// error ids. Omitted when neither is present.
	const describedBy = useAriaIds(input['aria-describedby'], control?.describedBy)

	const severity = control?.severity

	// An explicit `invalid` (prop, ambient `<Control invalid>`, or form binding)
	// or an `error` severity marks the control invalid. A nested `<Message>` is
	// presentational: it never drives the chrome — the ring comes from severity.
	const invalid = control?.invalid || input.invalid || severity === 'error' || undefined

	// Invalid wins the validation chrome; otherwise reflect a warning / success
	// severity. The three states are mutually exclusive.
	const validation = validationAttrs(
		invalid ? 'error' : severity === 'warning' || severity === 'success' ? severity : undefined,
	)

	return {
		id: input.id ?? control?.id,
		autoComplete: input.autoComplete ?? control?.autoComplete,
		disabled: input.disabled ?? control?.disabled,
		required: input.required ?? control?.required,
		readOnly: input.readOnly ?? control?.readOnly,
		invalid,
		'aria-describedby': describedBy,
		validation,
	}
}
