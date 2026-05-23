'use client'

import { CurrencyInput, type CurrencyInputProps } from '../currency-input'
import type { EditableGridEditorProps } from './types'
import { useEditableGridNumericEditor } from './use-editable-grid-numeric-editor'

export type EditableGridCurrencyEditorProps<T> = EditableGridEditorProps<T> &
	Pick<CurrencyInputProps, 'currency' | 'locale' | 'precision'>

/**
 * In-cell editor backed by `CurrencyInput`. Reads the initial numeric value
 * from `column.field` and routes Enter / Tab / Escape / blur through the
 * grid's commit and cancel callbacks. Pair with a numeric `parse` on the
 * column to round-trip the value as a number.
 */
export function EditableGridCurrencyEditor<T>(props: EditableGridCurrencyEditorProps<T>) {
	const bindings = useEditableGridNumericEditor(props)

	return (
		<CurrencyInput
			{...bindings}
			data-slot="editable-grid-currency-input"
			aria-label={props.ariaLabel}
			currency={props.currency}
			locale={props.locale}
			precision={props.precision}
		/>
	)
}
