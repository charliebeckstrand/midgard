'use client'

import { useLayoutEffect, useRef } from 'react'
import { k } from '../../recipes/kata/editable-grid'
import { Headless } from '../headless'
import { Input } from '../input'
import { editorKeyHandler } from './editable-grid-editor-utilities'
import type { EditableGridEditorProps } from './types'

/**
 * Default inline editor. Renders a bare `Input` (via `Headless`) that fills
 * the cell, mirrors the cell's draft buffer, and routes Enter / Tab / Escape /
 * blur through the grid's commit and cancel callbacks.
 */
export function EditableGridTextEditor<T>({
	draft,
	setDraft,
	commit,
	cancel,
	align,
	ariaLabel,
	selectAllOnFocus,
}: EditableGridEditorProps<T>) {
	const inputRef = useRef<HTMLInputElement>(null)

	// Snapshots the focus mode at mount; the effect does not re-run when typing
	// flips the draft / formatted comparison.
	const selectAllOnMount = useRef(selectAllOnFocus).current

	useLayoutEffect(() => {
		const input = inputRef.current

		if (!input) return

		input.focus()

		if (selectAllOnMount) input.select()
		else input.setSelectionRange(input.value.length, input.value.length)
	}, [selectAllOnMount])

	return (
		<Headless>
			<Input
				ref={inputRef}
				data-slot="editable-grid-input"
				aria-label={ariaLabel}
				className={k.editInput({ align })}
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={() => commit('none')}
				onKeyDown={editorKeyHandler(commit, cancel)}
			/>
		</Headless>
	)
}
