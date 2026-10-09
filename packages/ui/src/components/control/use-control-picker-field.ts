'use client'

import { useCallback } from 'react'
import type { SetValue } from '../../hooks/use-controllable'
import { useIdScope } from '../../hooks/use-id-scope'
import { useFormValue } from '../form/use-form-value'
import { useControlProps } from './use-control-props'

type PickerFieldOptions<T> = {
	/** The Form field name. It binds the value to an enclosing `<Form>`. */
	name: string | undefined
	value: T | null | undefined
	defaultValue: T | undefined
	onValueChange: ((value: T | null) => void) | undefined
	disabled: boolean | undefined
	readOnly: boolean | undefined
}

/**
 * The field binding that each popover picker shares: the Form value, the
 * Control cascade, and the trigger id.
 *
 * An explicit prop wins over the enclosing Control. The field error merges
 * with an ambient error severity. While `readOnly` is on, `setValue` writes
 * nothing. A controlled `open` can still show the panel, so this rule covers
 * each write path, and not only the open paths.
 *
 * @returns `value`, the guarded `setValue`, `setTouched`, and `field`, the
 * resolved props of the trigger.
 * @internal
 */
export function useControlPickerField<T>({
	name,
	value,
	defaultValue,
	onValueChange,
	disabled,
	readOnly,
}: PickerFieldOptions<T>) {
	const bound = useFormValue<T>(name, { value, defaultValue, onValueChange })

	const controlProps = useControlProps({ disabled, readOnly, invalid: bound.invalid })

	const scope = useIdScope({ id: controlProps.id })

	const resolvedReadOnly = controlProps.readOnly === true

	const { setValue: setBound } = bound

	const setValue = useCallback(
		(next: SetValue<T>) => {
			if (resolvedReadOnly) return

			setBound(next)
		},
		[resolvedReadOnly, setBound],
	)

	return {
		value: bound.value,
		setValue,
		setTouched: bound.setTouched,
		field: {
			triggerId: scope.id,
			describedBy: controlProps['aria-describedby'],
			disabled: controlProps.disabled === true,
			readOnly: resolvedReadOnly,
			required: controlProps.required,
			invalid: controlProps.invalid,
			validation: controlProps.validation,
		},
	}
}
