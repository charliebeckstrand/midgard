'use client'

import { type KeyboardEvent, type RefObject, useLayoutEffect, useRef, useState } from 'react'
import { editorKeyHandler } from './editable-grid-editor-utilities'
import type { EditableGridEditorProps } from './types'

type NumericEditorBindings = {
	ref: RefObject<HTMLInputElement | null>
	value: number | undefined
	onValueChange: (next: number | undefined) => void
	onBlur: () => void
	onKeyDown: (e: KeyboardEvent<HTMLElement>) => void
}

/**
 * Shared wiring for numeric editor slots (CurrencyInput- / NumberInput-backed).
 * Seeds the local value from `column.field`, mirrors edits into the grid's
 * draft as `String(value)`, focuses-and-selects on mount, and forwards the
 * standard editor keyboard contract.
 */
export function useEditableGridNumericEditor<T>({
	row,
	column,
	setDraft,
	commit,
	cancel,
}: EditableGridEditorProps<T>): NumericEditorBindings {
	const initial = column.field ? (row[column.field] as unknown) : undefined

	const [value, setValue] = useState<number | undefined>(
		typeof initial === 'number' ? initial : undefined,
	)

	const ref = useRef<HTMLInputElement>(null)

	useLayoutEffect(() => {
		const input = ref.current

		if (!input) return

		input.focus()

		input.select()
	}, [])

	return {
		ref,
		value,
		onValueChange: (next) => {
			setValue(next)

			setDraft(next === undefined ? '' : String(next))
		},
		onBlur: () => commit('none'),
		onKeyDown: editorKeyHandler(commit, cancel),
	}
}
