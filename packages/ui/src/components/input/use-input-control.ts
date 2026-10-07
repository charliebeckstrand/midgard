'use client'

import type { ChangeEventHandler, ComponentProps, FocusEventHandler } from 'react'
import { invalidAttrs } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { useGlass } from '../../providers/glass/context'
import { useHeadless } from '../../providers/headless/context'
import { type ControlVariant, useControl } from '../control/context'
import { useControlProps } from '../control/use-control-props'
import { useInputValue } from './use-input-value'

/**
 * The props of a text control that {@link useInputControl} resolves against
 * the Form, Control, glass, and headless context.
 *
 * @internal
 */
export type InputControlOptions<E extends HTMLInputElement | HTMLTextAreaElement> = {
	id?: string
	name?: string
	autoComplete?: string
	disabled?: boolean
	required?: boolean
	readOnly?: boolean
	invalid?: boolean
	variant?: ControlVariant
	value?: ComponentProps<'input'>['value'] | null
	defaultValue?: ComponentProps<'input'>['defaultValue']
	onChange?: ChangeEventHandler<E>
	onBlur?: FocusEventHandler<E>
	'aria-describedby'?: string
}

/**
 * The control setup that Input and Textarea share. It resolves the value
 * cascade of {@link useInputValue}, the Control cascade of
 * {@link useControlProps}, the scoped id, the surface variant, and the
 * validation attributes.
 *
 * @param options - The text-control props of the caller.
 * @returns `attrs` to spread on the `<input>` or the `<textarea>`; the surface
 * `variant`, which is the prop, else the Control variant, else glass in a
 * GlassProvider; and the `headless` flag.
 * @remarks `defaultValue` reaches the element only while the control is
 * uncontrolled. An explicit `invalid` sets the validation state on or off.
 * When `invalid` is omitted, the state comes from the bound field and the
 * Control cascade, which includes a warning or success severity of a Field.
 * @internal
 */
export function useInputControl<E extends HTMLInputElement | HTMLTextAreaElement>({
	id,
	name,
	autoComplete,
	disabled,
	required,
	readOnly,
	invalid,
	variant,
	value,
	defaultValue,
	onChange,
	onBlur,
	'aria-describedby': ariaDescribedBy,
}: InputControlOptions<E>) {
	const control = useControl()

	const glass = useGlass()

	const headless = useHeadless()

	const valueState = useInputValue<E>({ name, value, onChange, onBlur })

	const shared = useControlProps({
		id,
		autoComplete,
		disabled,
		required,
		readOnly,
		'aria-describedby': ariaDescribedBy,
		invalid: valueState.invalid,
	})

	const scope = useIdScope({ id: shared.id })

	return {
		attrs: {
			id: scope.id,
			name,
			autoComplete: shared.autoComplete,
			disabled: shared.disabled,
			required: shared.required,
			readOnly: shared.readOnly,
			value: valueState.value,
			defaultValue: valueState.value === undefined ? defaultValue : undefined,
			onChange: valueState.onChange,
			onBlur: valueState.onBlur,
			'aria-describedby': shared['aria-describedby'],
			...(invalid === undefined ? shared.validation : invalidAttrs(invalid)),
		},
		variant: variant ?? control?.variant ?? (glass ? ('glass' as const) : undefined),
		headless,
	}
}
