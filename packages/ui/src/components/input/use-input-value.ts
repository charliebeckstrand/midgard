'use client'

import type { ChangeEventHandler, ComponentProps, FocusEventHandler } from 'react'
import { composeEventHandlers } from '../../core'
import { useFormField } from '../form/context'
import { hasIssues } from '../form/form-reducer'

type InputValueOptions<E extends HTMLInputElement | HTMLTextAreaElement> = {
	name?: string
	value?: ComponentProps<'input'>['value'] | null
	onChange?: ChangeEventHandler<E>
	onBlur?: FocusEventHandler<E>
}

type InputValueResult<E extends HTMLInputElement | HTMLTextAreaElement> = {
	value: ComponentProps<'input'>['value']
	onChange: ChangeEventHandler<E> | undefined
	onBlur: FocusEventHandler<E> | undefined
	/** Pass to `useControlProps`; the field's error state merges into `invalid`. */
	invalid: boolean | undefined
}

/**
 * Resolves a text control's `value` / `onChange` / `onBlur` against the Form
 * binding cascade. The Input/Textarea cascade hook; Textarea shares it via the
 * element type param.
 *
 * @param options - Caller props: `name`, `value`, `onChange`, `onBlur`.
 * @returns The resolved `value`, `onChange`, `onBlur`, and the field's bound
 * `invalid` flag (to merge in `useControlProps`).
 * @remarks Resolution follows CONVENTIONS §7.3. `value === undefined` leaves the
 * control uncontrolled: it binds to the Form field named `name`, else falls back
 * to native (`defaultValue`) state. `value === null` keeps it controlled with no
 * current value, coerced to `''`. Any other `value` is controlled. An
 * explicit (non-`undefined`) `value` wins over the bound field, which still
 * supplies `invalid`. The field subscription is through {@link useFormField},
 * so a keystroke renders only this control. A bound `onChange` writes the
 * field and a bound `onBlur` marks it touched, after the handlers of the
 * caller. A `preventDefault()` in a handler of the caller does not stop the
 * write. A field value that is not a string becomes `''`. The boolean analogue
 * is `useFormToggle`.
 */
export function useInputValue<E extends HTMLInputElement | HTMLTextAreaElement = HTMLInputElement>({
	name,
	value,
	onChange,
	onBlur,
}: InputValueOptions<E>): InputValueResult<E> {
	const field = useFormField(name)

	// §7.3: `undefined` is uncontrolled (binds to the Form field or native
	// state); `null` is controlled with no value; anything else is controlled.
	if (value === undefined && field) {
		return {
			value: typeof field.value === 'string' ? field.value : '',
			// The field write and the touched mark run whatever the caller does
			// (CONVENTIONS.md §3.9).
			onChange: composeEventHandlers(onChange, (event) => field.setValue(event.target.value), {
				checkForDefaultPrevented: false,
			}),
			onBlur: composeEventHandlers(onBlur, () => field.setTouched(), {
				checkForDefaultPrevented: false,
			}),
			invalid: hasIssues(field.errors),
		}
	}

	return {
		value: value === null ? '' : value,
		onChange,
		onBlur,
		invalid: field ? hasIssues(field.errors) : undefined,
	}
}
