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
 * Seeds the local value from the grid `draft` (type-to-edit) or `column.field`,
 * mirrors edits into the draft as `String(value)`, focuses on mount (selecting
 * only for Enter/F2/double-click opens), and forwards the standard editor
 * keyboard contract.
 */
export function useEditableGridNumericEditor<T>({
	row,
	column,
	draft,
	setDraft,
	commit,
	cancel,
	selectAllOnFocus,
}: EditableGridEditorProps<T>): NumericEditorBindings {
	// Type-to-edit seeds the grid draft with the typed key before the editor
	// mounts — honor it (the text editor reads `draft` directly), or the first
	// keystroke is silently replaced by the old value. Non-numeric drafts (the
	// Enter / double-click paths seed the *formatted* display, e.g. "$1,234.00")
	// fall back to the row field.
	const fromDraft = draft === '' ? Number.NaN : Number(draft)

	const fieldValue = column.field ? (row[column.field] as unknown) : undefined

	const initial = Number.isFinite(fromDraft)
		? fromDraft
		: typeof fieldValue === 'number'
			? fieldValue
			: undefined

	const [value, setValue] = useState<number | undefined>(initial)

	const ref = useRef<HTMLInputElement>(null)

	// Captured at mount: mid-edit draft changes must not re-trigger selection.
	const selectOnMountRef = useRef(selectAllOnFocus)

	useLayoutEffect(() => {
		const input = ref.current

		if (!input) return

		input.focus()

		// Select-all only when the draft holds the prior value to be replaced —
		// selecting after type-to-edit would make the next keystroke wipe the
		// first one.
		if (selectOnMountRef.current) input.select()
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
