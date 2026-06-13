'use client'

import type { ChangeEvent, FocusEvent } from 'react'
import { useFormField } from './context'

/** DOM-event binding for a string-valued control: a coerced `value`, `onChange`/`onBlur` wired to the field, and an `invalid` flag derived from its errors. */
export type FormTextBinding<E extends HTMLInputElement | HTMLTextAreaElement = HTMLInputElement> = {
	value: string
	onChange: (e: ChangeEvent<E>) => void
	onBlur: (e: FocusEvent<E>) => void
	invalid: boolean
}

/**
 * Binds a native string-value control (`Input`, `Textarea`) to the enclosing
 * form field named `name`, returning props ready to spread onto the element.
 * `onChange` writes the field, `onBlur` marks it touched, and a non-empty error
 * list flips `invalid`.
 *
 * @param name - Field key to bind; undefined opts out (returns undefined, e.g.
 * for an unbound control outside any `Form`).
 * @param handlers - Optional `onChange`/`onBlur` to chain after the field is
 * updated.
 * @returns A {@link FormTextBinding} to spread onto the control, or undefined
 * when `name` is absent or there is no enclosing `Form`.
 * @typeParam E - The bound element type (`HTMLInputElement` by default,
 * `HTMLTextAreaElement` for textareas), threaded through the event handlers.
 * @remarks Subscribes through {@link useFormField}, so a keystroke re-renders
 * only this control. Non-string field values coerce to `''`. The boolean
 * analogue is {@link useFormToggle}; for `onValueChange`-shaped controls use
 * {@link useFormValue}.
 */
export function useFormText<E extends HTMLInputElement | HTMLTextAreaElement = HTMLInputElement>(
	name: string | undefined,
	handlers?: {
		onChange?: (e: ChangeEvent<E>) => void
		onBlur?: (e: FocusEvent<E>) => void
	},
): FormTextBinding<E> | undefined {
	const field = useFormField(name)

	if (!field) return undefined

	return {
		value: typeof field.value === 'string' ? field.value : '',
		onChange: (e) => {
			field.setValue(e.target.value)
			handlers?.onChange?.(e)
		},
		onBlur: (e) => {
			field.setTouched()
			handlers?.onBlur?.(e)
		},
		invalid: field.errors !== undefined && field.errors.length > 0,
	}
}
