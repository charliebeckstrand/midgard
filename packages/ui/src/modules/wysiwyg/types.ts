import type { MarkdownRange } from '../../components/markdown/markdown-ranges'

/**
 * A formatting action of a {@link WysiwygToolbar}: the heading level of the
 * blocks (`heading`), a mark (`bold`, `italic`, `strike`, `code`), a link, or a
 * block (`bulletList`, `orderedList`, `quote`, `codeBlock`).
 */
export type WysiwygAction =
	| 'heading'
	| 'bold'
	| 'italic'
	| 'strike'
	| 'code'
	| 'link'
	| 'bulletList'
	| 'orderedList'
	| 'quote'
	| 'codeBlock'

/**
 * An action that a toolbar button toggles at the selection: each
 * {@link WysiwygAction} but `link`, which opens a dialog, and `heading`, which
 * opens the rail of the levels. Neither has one command.
 *
 * @internal
 */
export type WysiwygToggleAction = Exclude<WysiwygAction, 'link' | 'heading'>

/**
 * A level of the heading rail: `0` is a paragraph, and `1` to `3` are the
 * heading levels. A message draws each level below 3 at the size of the body
 * text, so the rail has no level below 3.
 *
 * @internal
 */
export type WysiwygHeadingLevel = 0 | 1 | 2 | 3

/** A range in a {@link WysiwygBlock}: its id, and its span in the text of the block. */
export type WysiwygBlockRange = {
	id: string
	/** The offset of the first character of the range. */
	start: number
	/** The offset after the last character of the range. */
	end: number
}

/**
 * The text block that holds the caret, such as a paragraph or a heading, as
 * `onSelectionChange` of a {@link Wysiwyg} gives it. It is plain text, so an
 * offset of the text is a place in the block, with no Markdown syntax.
 */
export type WysiwygBlock = {
	/**
	 * The text of the block. A line break is a newline, and an inline atom,
	 * such as an image, is U+FFFC, so each character is one place of the block.
	 */
	text: string
	/** The offset of the caret in `text`. */
	caret: number
	/** The ranges of the block, in the order of the text. */
	ranges: readonly WysiwygBlockRange[]
}

/** The handle of a {@link Wysiwyg}, which its `ref` gets. */
export type WysiwygHandle<R extends MarkdownRange = MarkdownRange> = {
	/** Moves the focus to the field. */
	focus: () => void
	/** The Markdown source of the field. */
	readonly value: string
	/** The editable element. */
	readonly element: HTMLElement | null
	/**
	 * Replaces the text from `from` to `to` of the block that holds the caret
	 * ({@link WysiwygBlock}) with `text`, and puts the caret after `text`. An
	 * undo takes back the change, and not the text before it. A completion,
	 * such as a mention picker, calls it.
	 *
	 * `range` marks a span of the new text: its `start` and `end` are offsets
	 * of the block after the change. `onValueChange` then gives the range back
	 * with the offsets of the Markdown value. Nothing changes before the editor
	 * loads, while no caret is in a block, or for offsets outside the block.
	 */
	replace: (from: number, to: number, text: string, range?: R) => void
}
