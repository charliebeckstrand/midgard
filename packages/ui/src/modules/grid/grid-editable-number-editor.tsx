'use client'

import { NumberInput, type NumberInputProps } from '../../components/number-input'
import type { GridEditableEditorProps } from './grid-editable-types'
import { useGridEditableNumericEditor } from './use-grid-editable-numeric-editor'

/**
 * Props for {@link GridEditableNumberEditor}: the {@link GridEditableEditorProps}
 * edit-slot contract plus the `min`/`max`/`step` constraints forwarded to the
 * underlying `NumberInput`.
 *
 * @typeParam T - The row type backing the cell under edit.
 */
export type GridEditableNumberEditorProps<T> = GridEditableEditorProps<T> &
	Pick<NumberInputProps, 'min' | 'max' | 'step'>

/**
 * In-cell editor backed by `NumberInput`. Reads the initial numeric value
 * from `column.field` and routes Enter / Tab / Escape / blur through the
 * grid's commit and cancel callbacks. Pair with a numeric `parse` on the
 * column to round-trip the value as a number.
 *
 * @typeParam T - The row type backing the cell under edit.
 */
export function GridEditableNumberEditor<T>(props: GridEditableNumberEditorProps<T>) {
	const bindings = useGridEditableNumericEditor(props)

	return (
		<NumberInput
			{...bindings}
			data-slot="grid-editable-number-input"
			aria-label={props.ariaLabel}
			min={props.min}
			max={props.max}
			step={props.step}
		/>
	)
}
