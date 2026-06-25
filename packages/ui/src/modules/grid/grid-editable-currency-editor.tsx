'use client'

import { CurrencyInput, type CurrencyInputProps } from '../../components/currency-input'
import type { GridEditableEditorProps } from './grid-editable-types'
import { useGridEditableNumericEditor } from './use-grid-editable-numeric-editor'

/**
 * Props for {@link GridEditableCurrencyEditor}: the {@link GridEditableEditorProps}
 * edit-slot contract plus the `currency`/`locale`/`precision` formatting controls
 * forwarded to the underlying `CurrencyInput`.
 *
 * @typeParam T - The row type backing the cell under edit.
 */
export type GridEditableCurrencyEditorProps<T> = GridEditableEditorProps<T> &
	Pick<CurrencyInputProps, 'currency' | 'locale' | 'precision'>

/**
 * In-cell editor backed by `CurrencyInput`. Reads the initial numeric value
 * from `column.field` and routes Enter / Tab / Escape / blur through the
 * grid's commit and cancel callbacks. Pair with a numeric `parse` on the
 * column to round-trip the value as a number.
 *
 * @typeParam T - The row type backing the cell under edit.
 */
export function GridEditableCurrencyEditor<T>(props: GridEditableCurrencyEditorProps<T>) {
	const bindings = useGridEditableNumericEditor(props)

	return (
		<CurrencyInput
			{...bindings}
			data-slot="grid-editable-currency-input"
			aria-label={props.ariaLabel}
			currency={props.currency}
			locale={props.locale}
			precision={props.precision}
			prefix={false}
		/>
	)
}
