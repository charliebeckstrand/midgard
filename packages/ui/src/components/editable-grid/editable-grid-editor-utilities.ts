import type { KeyboardEvent } from 'react'
import type { EditableGridCommitAdvance } from './types'

type Commit = (advance: EditableGridCommitAdvance) => boolean

/**
 * Standard keyboard contract for editor slots: Enter commits down, Escape
 * cancels, Tab commits in the tabbing direction (and only swallows the event
 * when the cursor stays in the grid). Use to keep custom editors keyboard-
 * compatible with the built-in ones.
 */
export const editorKeyHandler =
	(commit: Commit, cancel: () => void) => (e: KeyboardEvent<HTMLElement>) => {
		if (e.key === 'Enter') {
			e.preventDefault()

			commit('down')
		} else if (e.key === 'Escape') {
			e.preventDefault()

			cancel()
		} else if (e.key === 'Tab') {
			if (commit(e.shiftKey ? 'left' : 'right')) e.preventDefault()
		}
	}
