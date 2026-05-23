'use client'

import { useLayoutEffect, useRef } from 'react'
import { k } from '../../recipes/kata/editable-grid'
import type { EditableGridEditorProps } from './types'

/**
 * Default inline editor. Renders a bare `<input>` that fills the cell, mirrors
 * the cell's draft buffer, and routes Enter / Tab / Escape / blur through the
 * grid's commit and cancel callbacks.
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

	const selectAllRef = useRef(selectAllOnFocus)

	selectAllRef.current = selectAllOnFocus

	// Focus and place the caret once on mount; subsequent re-renders (the user
	// typing into the input) must not reset the selection.
	useLayoutEffect(() => {
		const input = inputRef.current

		if (!input) return

		input.focus()

		if (selectAllRef.current) input.select()
		else input.setSelectionRange(input.value.length, input.value.length)
	}, [])

	return (
		<input
			ref={inputRef}
			data-slot="editable-grid-input"
			size={1}
			aria-label={ariaLabel}
			className={k.editInput({ align })}
			value={draft}
			onChange={(e) => setDraft(e.target.value)}
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
