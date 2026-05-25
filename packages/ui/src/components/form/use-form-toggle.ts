'use client'

import type { ChangeEvent } from 'react'
import { useFormField } from './context'

export type FormToggleBinding = {
	checked: boolean
	onChange: (e: ChangeEvent<HTMLInputElement>) => void
	invalid: boolean
}

/** Binding for boolean-value controls (Checkbox, Switch). */
export function useFormToggle(
	name: string | undefined,
	handlers?: { onChange?: (e: ChangeEvent<HTMLInputElement>) => void },
): FormToggleBinding | undefined {
	const field = useFormField(name)

	if (!field) return undefined

	return {
		checked: typeof field.value === 'boolean' ? field.value : false,
		onChange: (e) => {
			field.setValue(e.target.checked)
			field.setTouched()
			handlers?.onChange?.(e)
		},
		invalid: field.errors !== undefined && field.errors.length > 0,
	}
}
