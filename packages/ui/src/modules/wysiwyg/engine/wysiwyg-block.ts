import { closeHistory } from 'prosemirror-history'
import { type EditorState, TextSelection, type Transaction } from 'prosemirror-state'
import type { WysiwygBlock, WysiwygBlockRange } from '../types'
import { LEAF } from './wysiwyg-dom'
import { schema } from './wysiwyg-schema'

/** The text of an inline leaf: a newline for a line break, and U+FFFC for an atom. @internal */
function leafText(leaf: { type: unknown }): string {
	return leaf.type === schema.nodes.hard_break ? '\n' : LEAF
}

/**
 * The text block that holds a collapsed caret, as plain text. Each leaf is one
 * character, so an offset of the text is an offset of the block. A code block
 * holds no range, so it gives `null`, as a selection that is not collapsed does.
 *
 * @internal
 */
export function caretBlock(state: EditorState): WysiwygBlock | null {
	const { selection } = state

	const { $from } = selection

	if (!selection.empty || !$from.parent.isTextblock || $from.parent.type.spec.code) return null

	const block = $from.parent

	const ranges: WysiwygBlockRange[] = []

	block.forEach((child, offset) => {
		const mark = schema.marks.range.isInSet(child.marks)

		if (!mark) return

		const last = ranges.at(-1)

		// The pieces of one range are next to each other, so a piece extends the last range.
		if (last !== undefined && last.id === mark.attrs.id && last.end === offset)
			last.end = offset + child.nodeSize
		else ranges.push({ id: mark.attrs.id, start: offset, end: offset + child.nodeSize })
	})

	return {
		text: block.textBetween(0, block.content.size, undefined, leafText),
		caret: $from.parentOffset,
		ranges,
	}
}

/** Whether `from` to `to` is a span of a text of `length` characters. @internal */
function within(from: number, to: number, length: number): boolean {
	return from >= 0 && to >= from && to <= length
}

/**
 * The transaction that replaces the text from `from` to `to` of the block of
 * the caret with `text`, marks `range` in the new text, and puts the caret
 * after `text`. It starts a new step of the undo history, so an undo takes
 * back the change and not the text before it. It gives `null` while no caret
 * is in a block, or for offsets outside the block.
 *
 * @internal
 */
export function replaceInBlock(
	state: EditorState,
	from: number,
	to: number,
	text: string,
	range: WysiwygBlockRange | undefined,
): Transaction | null {
	const block = caretBlock(state)

	if (!block || !within(from, to, block.text.length)) return null

	const length = block.text.length - (to - from) + text.length

	if (range && !within(range.start, range.end, length)) return null

	const base = state.selection.$from.start()

	const tr = closeHistory(state.tr.insertText(text, base + from, base + to))

	if (range) {
		tr.addMark(base + range.start, base + range.end, schema.marks.range.create({ id: range.id }))
	}

	return tr.setSelection(TextSelection.create(tr.doc, base + from + text.length)).scrollIntoView()
}
