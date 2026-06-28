import type { KeyboardEvent } from 'react'

/** The primitive-typed inline editor the grid mounts when a column supplies no `editCell` slot. @internal */
export type EditorKind = 'text' | 'number' | 'boolean'

/**
 * Picks the inline editor for a cell from its value's primitive type: a boolean
 * toggles a checkbox, a number drives a number input, and everything else (string,
 * null, undefined) falls back to a plain text input. A column's
 * {@link GridColumn.editCell} slot supersedes this for richer controls. @internal
 */
export function inferEditorKind(value: unknown): EditorKind {
	if (typeof value === 'boolean') return 'boolean'

	if (typeof value === 'number') return 'number'

	return 'text'
}

/**
 * Whether a keydown is a lone printable character (no Ctrl/Cmd/Alt), used to
 * begin editing a text cell by typing into it. @internal
 */
export function isPrintableKey(event: KeyboardEvent): boolean {
	return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey
}
