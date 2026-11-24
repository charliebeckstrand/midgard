/**
 * A formatting action of a {@link WysiwygToolbar}: a mark (`bold`, `italic`,
 * `strike`, `code`), a link, or a block (`bulletList`, `orderedList`, `quote`,
 * `codeBlock`).
 */
export type WysiwygAction =
	| 'bold'
	| 'italic'
	| 'strike'
	| 'code'
	| 'link'
	| 'bulletList'
	| 'orderedList'
	| 'quote'
	| 'codeBlock'

/** The handle of a {@link Wysiwyg}, which its `ref` gets. */
export type WysiwygHandle = {
	/** Moves the focus to the field. */
	focus: () => void
	/** The Markdown source of the field. */
	readonly value: string
	/** The editable element. */
	readonly element: HTMLElement | null
}
