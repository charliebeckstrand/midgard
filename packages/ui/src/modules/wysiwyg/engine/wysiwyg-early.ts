import { deleteSelection } from 'prosemirror-commands'
import { redo, undo } from 'prosemirror-history'
import type { Node } from 'prosemirror-model'
import { Plugin, PluginKey, TextSelection, type Transaction } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'
import type { WysiwygEarlyField, WysiwygEarlyItem } from '../wysiwyg-early-input'
import { wysiwygCommands } from './wysiwyg-commands'
import { LEAF } from './wysiwyg-dom'

/** The text of the content of a text block, where each character is one position of the doc. @internal */
function blockText(node: Node): string {
	return node.textBetween(0, node.content.size, undefined, () => LEAF)
}

/** A text block of the doc, and the position of the start of its content. @internal */
type EarlyBlock = { node: Node; start: number }

/** The text blocks of `doc`, in their order, as the markup draws them. @internal */
function docBlocks(doc: Node): EarlyBlock[] {
	const blocks: EarlyBlock[] = []

	doc.descendants((node, pos) => {
		if (!node.isTextblock) return true

		blocks.push({ node, start: pos + 1 })

		return false
	})

	return blocks
}

/** A change of the text of a block: `before` from `start` to `endA` is now `after` from `start` to `endB`. @internal */
type TextChange = { start: number; endA: number; endB: number }

/**
 * The change from `before` to `after`, or `null` when they are the same. A
 * run of one repeated character has more than one change, such as a key
 * typed in `aa`. The change then ends at the caret where it can, as the edit
 * of the reader did.
 *
 * @internal
 */
function textChange(before: string, after: string, caret: number | null): TextChange | null {
	if (before === after) return null

	const shorter = Math.min(before.length, after.length)

	let start = 0

	while (start < shorter && before.charCodeAt(start) === after.charCodeAt(start)) start++

	let endA = before.length

	let endB = after.length

	while (
		endA > start &&
		endB > start &&
		before.charCodeAt(endA - 1) === after.charCodeAt(endB - 1)
	) {
		endA--
		endB--
	}

	if (caret !== null) {
		while (
			endB > caret &&
			start > 0 &&
			before.charCodeAt(endA - 1) === after.charCodeAt(endB - 1)
		) {
			start--
			endA--
			endB--
		}
	}

	return { start, endA, endB }
}

/**
 * Types `text` at the selection, as a key does: an input rule, such as a
 * Markdown shortcut, sees it, and the text takes the marks at the caret.
 *
 * @internal
 */
function typeText(view: EditorView, text: string): void {
	const { from, to } = view.state.selection

	const typed = () => view.state.tr.insertText(text, from, to)

	if (!view.someProp('handleTextInput', (handle) => handle(view, from, to, text, typed))) {
		view.dispatch(typed().scrollIntoView())
	}
}

/** The change of the text of one block of the markup. @internal */
type BlockChange = { block: EarlyBlock; change: TextChange; text: string }

/** A point of the selection in a block of the markup, and the change of that block. @internal */
type BlockPoint = { block: EarlyBlock; change: TextChange | null; offset: number }

/** The anchor and the head of a selection in the blocks of the markup. @internal */
type BlockSelection = { anchor: BlockPoint | null; head: BlockPoint | null }

/** The edits of the reader in the markup. @internal */
type EarlyEdits = BlockSelection & { changes: BlockChange[]; moves: BlockSelection[] }

/**
 * Reads the edits of the reader in the markup: the change of the text of each
 * block, the anchor and the head of the selection, and each move of the
 * reader.
 *
 * @internal
 */
function readEdits(doc: Node, field: WysiwygEarlyField): EarlyEdits {
	const points = [field, ...field.moves].flatMap(({ anchor, head }) => [anchor, head])

	const blocks = docBlocks(doc)

	// The markup draws each text block of the doc. Another count is a markup
	// that the editor cannot read, so it takes nothing from it.
	const read = blocks.length === field.blocks.length

	const changes: BlockChange[] = []

	const found: (BlockPoint | null)[] = points.map(() => null)

	blocks.forEach((block, index) => {
		const after = field.blocks[index]

		if (!read || after === undefined) return

		const offsetIn = (point: (typeof points)[number] | undefined) =>
			point?.block === index ? point.offset : null

		const caret = offsetIn(points[1]) ?? offsetIn(points[0])

		const diff = textChange(blockText(block.node), after, caret)

		const text = diff ? after.slice(diff.start, diff.endB) : ''

		// The browser makes no line break and no atom, so a change that holds one
		// is not an edit of the reader, and the points of the block are not points
		// of the doc.
		if (diff && text.includes(LEAF)) return

		if (diff) changes.push({ block, change: diff, text })

		points.forEach((point, at) => {
			if (point?.block === index) found[at] = { block, change: diff, offset: point.offset }
		})
	})

	// A selection with one point in a block is a caret at that point.
	const selection = (index: number): BlockSelection => {
		const anchor = found[index] ?? null

		const head = found[index + 1] ?? null

		return { anchor: anchor ?? head, head: head ?? anchor }
	}

	return {
		changes,
		...selection(0),
		moves: field.moves.map((_, index) => selection(2 * index + 2)),
	}
}

/** The position in the changed doc of a point of the markup. @internal */
function mapPoint(tr: Transaction, { block, change, offset }: BlockPoint): number {
	if (!change || offset <= change.start) return tr.mapping.map(block.start + offset, -1)

	if (offset >= change.endB) {
		return tr.mapping.map(block.start + change.endA + offset - change.endB, 1)
	}

	return tr.mapping.map(block.start + change.start, -1) + offset - change.start
}

/**
 * The change of text that the reader typed at one place, with the caret
 * after it, when it is the only change.
 *
 * @internal
 */
function typedAtCaret({ changes, anchor, head }: EarlyEdits): BlockChange | null {
	const [only] = changes

	if (changes.length !== 1 || !only || only.change.endA !== only.change.start) return null

	const after = (point: BlockPoint | null) =>
		point?.block === only.block && point.offset === only.change.endB

	return after(anchor) && after(head) ? only : null
}

/**
 * The key of the moves of the reader before the load, and the meta of a
 * transaction that sets the positions of some of them. The state holds the
 * anchor and the head of each move, as positions of the doc. Each change
 * maps them, and a position stays before text that comes at it, as the
 * reader did not see that text.
 *
 * @internal
 */
const MOVES = new PluginKey<readonly (number | null)[]>('wysiwygEarlyMoves')

/** A position of the anchor (an even index) or the head (an odd index) of a move. @internal */
type MoveSet = { index: number; pos: number }

/**
 * The moves of the reader before the load, as {@link MOVES} keeps them.
 *
 * @internal
 */
export function wysiwygEarlyMoves(): Plugin<readonly (number | null)[]> {
	return new Plugin<readonly (number | null)[]>({
		key: MOVES,
		state: {
			init: () => [],
			apply: (tr, points) => {
				const mapped = points.map((pos) => (pos === null ? null : tr.mapping.map(pos, -1)))

				for (const { index, pos } of (tr.getMeta(MOVES) as MoveSet[] | undefined) ?? []) {
					while (mapped.length <= index) mapped.push(null)

					mapped[index] = pos
				}

				return mapped
			},
		},
	})
}

/**
 * Puts the selection at a move of the reader before the load, as each change
 * since the load maps it. A move that the editor did not take does nothing.
 *
 * @internal
 */
export function selectEarlyMove(view: EditorView, move: number): void {
	const points = MOVES.getState(view.state) ?? []

	const anchor = points[2 * move]

	const head = points[2 * move + 1]

	if (anchor == null || head == null) return

	const { doc } = view.state

	view.dispatch(
		view.state.tr.setSelection(TextSelection.between(doc.resolve(anchor), doc.resolve(head))),
	)
}

/** Each point of the moves of the reader, by its index in the state of {@link MOVES}. @internal */
function movePoints(moves: readonly BlockSelection[]): { index: number; point: BlockPoint }[] {
	return moves.flatMap(({ anchor, head }, move) =>
		[anchor, head].flatMap((point, side) => (point ? [{ index: 2 * move + side, point }] : [])),
	)
}

/**
 * Types text that the reader typed at one place again, and sets the position
 * of each move. A point in the typed text takes the caret after the text
 * before it, so each later change maps it, as an input rule does.
 *
 * @internal
 */
function typeAgain(view: EditorView, typed: BlockChange, moves: readonly BlockSelection[]): void {
	const { start, endB } = typed.change

	const points = movePoints(moves)

	const inTyped = ({ point }: { point: BlockPoint }) =>
		point.block === typed.block && point.offset > start && point.offset <= endB

	const tr = view.state.tr.setSelection(
		TextSelection.create(view.state.doc, typed.block.start + start),
	)

	const before = points.filter((at) => !inTyped(at))

	view.dispatch(
		tr.setMeta(
			MOVES,
			before.map(({ index, point }) => ({ index, pos: mapPoint(tr, point) })),
		),
	)

	let waiting = points.filter(inTyped)

	let count = 0

	for (const char of typed.text) {
		typeText(view, char)

		count += char.length

		const reached = waiting.filter(({ point }) => point.offset - start <= count)

		if (reached.length === 0) continue

		waiting = waiting.filter((at) => !reached.includes(at))

		const pos = view.state.selection.head

		view.dispatch(
			view.state.tr.setMeta(
				MOVES,
				reached.map(({ index }) => ({ index, pos })),
			),
		)
	}
}

/**
 * Takes the input that the reader gave before the editor loaded: the text of
 * each text block of the markup, and the selection. The doc of the editor is
 * the doc that the markup drew, so each change of the text of a block is an
 * edit of the reader.
 *
 * Text that the reader typed at one place, with the caret after it, is typed
 * again, so a Markdown shortcut in it works as after the load. Each other
 * change is one step of the undo history.
 *
 * @internal
 */
export function adoptEarlyInput(view: EditorView, field: WysiwygEarlyField): void {
	const edits = readEdits(view.state.doc, field)

	const typed = typedAtCaret(edits)

	if (typed) {
		typeAgain(view, typed, edits.moves)

		return
	}

	const tr = view.state.tr

	// From the last change to the first, so each change keeps the positions of the ones before it.
	for (const { block, change, text } of edits.changes.toReversed()) {
		const from = block.start + change.start

		const to = block.start + change.endA

		// A typed key takes the marks of the span, as `insertText` gives them.
		if (text) tr.insertText(text, from, to)
		else tr.delete(from, to)
	}

	const { anchor, head } = edits

	if (anchor && head) {
		const $anchor = tr.doc.resolve(mapPoint(tr, anchor))

		tr.setSelection(TextSelection.between($anchor, tr.doc.resolve(mapPoint(tr, head))))
	}

	const moves = movePoints(edits.moves)

	if (moves.length > 0) {
		tr.setMeta(
			MOVES,
			moves.map(({ index, point }) => ({ index, pos: mapPoint(tr, point) })),
		)
	}

	if (tr.docChanged || tr.selectionSet || moves.length > 0) view.dispatch(tr)
}

/** The graphemes of a text. The bounds of a grapheme do not change with the locale, so the root locale serves each reader. */
const GRAPHEMES = new Intl.Segmenter('und', { granularity: 'grapheme' })

/** The size of the grapheme, the word, or the line before (or after, with `forward`) `at` in `text`. @internal */
function unitSize(
	text: string,
	at: number,
	forward: boolean,
	unit: 'character' | 'word' | 'line',
): number {
	const side = forward ? text.slice(at) : text.slice(0, at)

	if (unit === 'line') return side.length

	if (unit === 'word')
		return (forward ? /^(\s*\S+|\s+)/u : /(\S+\s*|\s+)$/u).exec(side)?.[0].length ?? 0

	const graphemes = [...GRAPHEMES.segment(side)]

	return (forward ? graphemes[0] : graphemes.at(-1))?.segment.length ?? 0
}

/**
 * Runs an input that the field held before the editor loaded, as if the
 * reader gave it now (see {@link WysiwygEarlyItem}). A key goes through the
 * key handlers of the field and the editor, as a key of the reader does.
 *
 * @internal
 */
export function replayEarlyInput(view: EditorView, item: WysiwygEarlyItem): void {
	const key = (init: KeyboardEventInit) =>
		view.someProp('handleKeyDown', (handle) =>
			handle(view, new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true })),
		) ?? false

	switch (item.type) {
		case 'key': {
			const { type: _, ...init } = item

			key(init)

			return
		}
		case 'text':
			typeText(view, item.text)

			return
		case 'paste': {
			// The paste handlers of the editor read the clipboard of the event.
			const clipboardData = new DataTransfer()

			clipboardData.setData('text/plain', item.text)

			clipboardData.setData('text/html', item.html)

			const event = new ClipboardEvent('paste', { clipboardData })

			// A paste in a code block takes the plain text, as the clipboard parser of the editor does.
			if (item.html && !(item.text && view.state.selection.$from.parent.type.spec.code)) {
				view.pasteHTML(item.html, event)
			} else view.pasteText(item.text, event)

			return
		}
		case 'format':
			wysiwygCommands[item.action].run(view.state, view.dispatch)

			return
		case 'history':
			;(item.redo ? redo : undo)(view.state, view.dispatch)

			return
		case 'delete': {
			if (deleteSelection(view.state, view.dispatch)) return

			// A delete at the edge of a block, such as a join, is a command of the editor.
			if (key({ key: item.forward ? 'Delete' : 'Backspace' })) return

			const { $from, from } = view.state.selection

			const size = unitSize(blockText($from.parent), $from.parentOffset, item.forward, item.unit)

			if (size === 0) return

			const tr = item.forward
				? view.state.tr.delete(from, from + size)
				: view.state.tr.delete(from - size, from)

			view.dispatch(tr.scrollIntoView())
		}
	}
}
