'use client'

import { NumberInput, type NumberInputProps } from '../number-input'
import type { EditableGridEditorProps } from './types'
import { useEditableGridNumericEditor } from './use-editable-grid-numeric-editor'

export type EditableGridNumberEditorProps<T> = EditableGridEditorProps<T> &
	Pick<NumberInputProps, 'min' | 'max' | 'step'>

/**
 * In-cell editor backed by `NumberInput`. Reads the initial numeric value
 * from `column.field` and routes Enter / Tab / Escape / blur through the
 * grid's commit and cancel callbacks. Pair with a numeric `parse` on the
 * column to round-trip the value as a number.
 */
export function EditableGridNumberEditor<T>(props: EditableGridNumberEditorProps<T>) {
	const bindings = useEditableGridNumericEditor(props)

	return (
		<NumberInput
			{...bindings}
			data-slot="editable-grid-number-input"
			aria-label={props.ariaLabel}
			min={props.min}
			max={props.max}
			step={props.step}
		/>
	)
}
