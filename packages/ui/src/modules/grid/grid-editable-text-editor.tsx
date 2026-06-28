'use client'

import { useLayoutEffect, useRef } from 'react'
import { Input } from '../../components/input'
import { HeadlessProvider } from '../../providers/headless'
import { k } from '../../recipes/kata/grid-editable'
import { editorKeyHandler } from './grid-editable-editor-utilities'
import type { GridEditableEditorProps } from './grid-editable-types'

/**
 * Default inline editor. Renders a bare `Input` (via `HeadlessProvider`) that fills
 * the cell, mirrors the cell's draft buffer, and routes Enter / Tab / Escape /
 * blur through the grid's commit and cancel callbacks.
 *
 * @remarks Consumes the shared {@link GridEditableEditorProps}; the default text
 * cell needs no editor-specific options, so it exports no dedicated props type
 * (unlike the number, currency, date, and select editors).
 * @typeParam T - The row type backing the cell under edit.
 */
export function GridEditableTextEditor<T>({
	draft,
	setDraft,
	commit,
	cancel,
	align,
	ariaLabel,
	selectAllOnFocus,
}: GridEditableEditorProps<T>) {
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
		<HeadlessProvider>
			<Input
				ref={inputRef}
				data-slot="grid-editable-input"
				aria-label={ariaLabel}
				className={k.editInput({ align })}
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
				onBlur={() => commit('none')}
				onKeyDown={editorKeyHandler(commit, cancel)}
			/>
		</HeadlessProvider>
	)
}
