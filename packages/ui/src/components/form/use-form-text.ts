'use client'

import type { ChangeEvent, FocusEvent } from 'react'
import { useFormField } from './context'

export type FormTextBinding<E extends HTMLInputElement | HTMLTextAreaElement = HTMLInputElement> = {
	value: string
	onChange: (e: ChangeEvent<E>) => void
	onBlur: (e: FocusEvent<E>) => void
	invalid: boolean
}

/** Binding for string-value controls (Input, Textarea). */
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
