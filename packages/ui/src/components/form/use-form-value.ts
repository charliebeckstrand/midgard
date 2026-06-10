'use client'

import { type SetValue, useControllable } from '../../hooks/use-controllable'
import { useFormField } from './context'

type FormValueOptions<T> = {
	/** Controlled value. Wins over the form field when both are present. */
	value?: T | null
	/** Initial value when uncontrolled and not form-bound. */
	defaultValue?: T | (() => T)
	onValueChange?: (value: T | undefined) => void
}

export type FormValueResult<T> = {
	value: T | undefined
	setValue: (value: SetValue<T>) => void
	/** Marks the field touched; no-op outside a Form. Call from `onBlur`. */
	setTouched: () => void
	/** Pass to `useControlProps`; the field's error state merges into `invalid`. */
	binding: { invalid: boolean } | undefined
}

/**
 * `useControllable` bound to an enclosing Form field by `name`: the
 * value-typed analogue of `useFormText` / `useFormToggle` for controls that
 * emit `onValueChange` instead of change events.
 *
 * Resolution mirrors Input's cascade: an explicit `value` prop wins; otherwise
 * a form field with this `name` drives the state (the store is the single
 * source of truth; `defaultValue` is ignored); otherwise the hook is plain
 * controlled / uncontrolled state.
 */
export function useFormValue<T>(
	name: string | undefined,
	{ value, defaultValue, onValueChange }: FormValueOptions<T>,
): FormValueResult<T> {
	const field = useFormField(name)

	const bound = field !== undefined && value === undefined

	const [current, setCurrent] = useControllable<T>({
		// `?? null` keeps a bound control controlled even while the store holds
		// no value yet.
		value: bound ? ((field.value as T | undefined) ?? null) : value,
		defaultValue,
		onValueChange: bound
			? (v) => {
					field.setValue(v)
					onValueChange?.(v)
				}
			: onValueChange,
	})

	return {
		value: current,
		setValue: setCurrent,
		setTouched: () => field?.setTouched(),
		binding: field && { invalid: field.errors !== undefined && field.errors.length > 0 },
	}
}
