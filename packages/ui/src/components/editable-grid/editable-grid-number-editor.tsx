'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { NumberInput, type NumberInputProps } from '../number-input'
import type { EditableGridEditorProps } from './types'

export type EditableGridNumberEditorProps<T> = EditableGridEditorProps<T> &
	Pick<NumberInputProps, 'min' | 'max' | 'step'>

/**
 * In-cell editor backed by `NumberInput`. Reads the initial numeric value
 * from `column.field`, mirrors edits into the grid's draft as a plain
 * `String(value)`, and routes Enter / Tab / Escape / blur through the grid's
 * commit and cancel callbacks. Pair with a numeric `parse` on the column to
 * round-trip the value as a number.
 */
export function EditableGridNumberEditor<T>({
	row,
	column,
	setDraft,
	commit,
	cancel,
	ariaLabel,
	min,
	max,
	step,
}: EditableGridNumberEditorProps<T>) {
	const initial = column.field ? (row[column.field] as unknown) : undefined

	const [value, setValue] = useState<number | undefined>(
		typeof initial === 'number' ? initial : undefined,
	)

	const inputRef = useRef<HTMLInputElement>(null)

	useLayoutEffect(() => {
		const input = inputRef.current

		if (!input) return

		input.focus()

		input.select()
	}, [])

	return (
		<NumberInput
			ref={inputRef}
			data-slot="editable-grid-number-input"
			aria-label={ariaLabel}
			min={min}
			max={max}
			step={step}
			value={value}
			onValueChange={(v) => {
				setValue(v)

				setDraft(v === undefined ? '' : String(v))
			}}
			onBlur={() => commit('none')}
			onKeyDown={(e) => {
				if (e.key === 'Enter') {
					e.preventDefault()

					commit('down')
				} else if (e.key === 'Escape') {
					e.preventDefault()

					cancel()
				} else if (e.key === 'Tab') {
					if (commit(e.shiftKey ? 'left' : 'right')) e.preventDefault()
				}
			}}
		/>
	)
}
