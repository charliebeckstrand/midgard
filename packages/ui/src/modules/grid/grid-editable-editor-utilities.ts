import type { KeyboardEvent } from 'react'
import type { GridEditableCommitAdvance } from './grid-editable-types'

type Commit = (advance: GridEditableCommitAdvance) => boolean

/**
 * Standard keyboard contract for editor slots: Enter commits down, Escape
 * cancels, Tab commits in the tabbing direction (and only swallows the event
 * when the cursor stays in the grid). Use to keep custom editors keyboard-
 * compatible with the built-in ones.
 *
 * @internal
 */
export const editorKeyHandler =
	(commit: Commit, cancel: () => void) => (event: KeyboardEvent<HTMLElement>) => {
		if (event.key === 'Enter') {
			event.preventDefault()

			commit('down')
		} else if (event.key === 'Escape') {
			event.preventDefault()

			cancel()
		} else if (event.key === 'Tab') {
			if (commit(event.shiftKey ? 'left' : 'right')) event.preventDefault()
		}
	}
