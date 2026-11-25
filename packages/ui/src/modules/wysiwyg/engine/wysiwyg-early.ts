import { redo, undo } from 'prosemirror-history'
import type { Node } from 'prosemirror-model'
import { TextSelection, type Transaction } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'
import type { WysiwygEarlyField, WysiwygEarlyItem, WysiwygEarlyPoint } from '../wysiwyg-early-input'
import { wysiwygCommands } from './wysiwyg-commands'
import { nodeDOM } from './wysiwyg-dom'

/** The text of an inline leaf, such as a line break or an atom: one character, as its size in the doc. */
const LEAF = '￼'

/** The text of the content of a text block, where each character is one position of the doc. @internal */
function blockText(node: Node): string {
	return node.textBetween(0, node.content.size, undefined, () => LEAF)
}

/**
 * A text block of the doc, and the element of the markup before the load
 * that holds its content.
 *
 * @internal
 */
type EarlyBlock = { node: Node; start: number; content: Element }

/**
 * Pairs each text block in `parent` with the element of the markup that draws
 * its content. The markup draws each node with the spec of the schema, so an
 * element child of `dom` is the node of the same index. A child that does not
 * match, which the field does not draw, pairs with no block.
 *
 * @internal
 */
function pairBlocks(parent: Node, dom: Element, start: number, out: EarlyBlock[]): void {
	const elements = dom.children

	if (elements.length !== parent.childCount) return

	parent.forEach((node, offset, index) => {
		const element = elements[index] as Element

		const spec = nodeDOM[node.type.name as keyof typeof nodeDOM]

		if (!spec || element.localName !== spec(node.attrs)[0]) return

		const pos = start + offset

		if (node.isTextblock) {
			const content = node.type.spec.code ? element.firstElementChild : element

			if (content && (!node.type.spec.code || content.localName === 'code')) {
				out.push({ node, start: pos + 1, content })
			}
		} else if (!node.isLeaf) pairBlocks(node, element, pos + 1, out)
	})
}

/**
 * The text of the content element of a block, as {@link blockText} gives the
 * text of its node, and the offset in it of each point that it holds. A line
 * break and an inline atom are one character. A last line break is the one
 * that keeps the height of the last line, as in the view of ProseMirror, so
 * it is no text.
 *
 * @internal
 */
function readBlock(
	content: Element,
	points: readonly (WysiwygEarlyPoint | null)[],
): { text: string; offsets: (number | null)[] } {
	const read: BlockRead = { content, points, text: '', offsets: points.map(() => null) }

	readChildren(read, content)

	return { text: read.text, offsets: read.offsets }
}

/** The state of {@link readBlock}: the text so far, and the offset of each point that it found. @internal */
type BlockRead = {
	content: Element
	points: readonly (WysiwygEarlyPoint | null)[]
	text: string
	offsets: (number | null)[]
}

/** Sets the offset of each point not yet found that `findOffset` places. @internal */
function placePoints(
	read: BlockRead,
	findOffset: (point: WysiwygEarlyPoint) => number | null,
): void {
	read.points.forEach((point, index) => {
		if (!point || read.offsets[index] !== null) return

		const offset = findOffset(point)

		if (offset !== null) read.offsets[index] = offset
	})
}

/** Reads the children of `node`, and each point between them. @internal */
function readChildren(read: BlockRead, node: globalThis.Node): void {
	node.childNodes.forEach((child, index) => {
		placePoints(read, (point) =>
			point.node === node && point.offset === index ? read.text.length : null,
		)

		readChild(read, node, child)
	})

	placePoints(read, (point) =>
		point.node === node && point.offset >= node.childNodes.length ? read.text.length : null,
	)
}

/** Reads one child of `parent`: a text, a line break, an atom, or an element of marks. @internal */
function readChild(read: BlockRead, parent: globalThis.Node, child: globalThis.Node): void {
	if (child.nodeType === child.TEXT_NODE) {
		placePoints(read, (point) => (point.node === child ? read.text.length + point.offset : null))

		read.text += child.nodeValue ?? ''

		return
	}

	if (!(child instanceof Element)) return

	if (child.localName === 'br') {
		if (parent !== read.content || child !== read.content.lastChild) read.text += LEAF

		return
	}

	if (child.hasAttribute('data-raw')) {
		placePoints(read, (point) => (child.contains(point.node) ? read.text.length : null))

		read.text += LEAF

		return
	}

	readChildren(read, child)
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
export function typeText(view: EditorView, text: string): void {
	const { from, to } = view.state.selection

	const typed = () => view.state.tr.insertText(text, from, to)

	if (!view.someProp('handleTextInput', (handle) => handle(view, from, to, text, typed))) {
		view.dispatch(typed().scrollIntoView())
	}
}

/** Replaces a span of a text block with text that takes the marks of the span, as a typed key does. @internal */
function replaceText(tr: Transaction, from: number, to: number, text: string): void {
	if (!text) {
		tr.delete(from, to)

		return
	}

	const $from = tr.doc.resolve(from)

	const marks = from === to ? $from.marks() : $from.marksAcross(tr.doc.resolve(to))

	tr.replaceWith(from, to, tr.doc.type.schema.text(text, marks ?? []))
}

/** The change of the text of one block of the markup. @internal */
type BlockChange = { block: EarlyBlock; change: TextChange; text: string }

/** A point of the selection in a block of the markup, and the change of that block. @internal */
type BlockPoint = { block: EarlyBlock; change: TextChange | null; offset: number }

/**
 * Reads the edits of the reader in the markup: the change of the text of each
 * block, and the anchor and the head of the selection.
 *
 * @internal
 */
function readEdits(
	doc: Node,
	field: WysiwygEarlyField,
): { changes: BlockChange[]; anchor: BlockPoint | null; head: BlockPoint | null } {
	const blocks: EarlyBlock[] = []

	pairBlocks(doc, field.root, 0, blocks)

	const changes: BlockChange[] = []

	const found: (BlockPoint | null)[] = [null, null]

	for (const block of blocks) {
		const read = readBlock(block.content, [field.anchor, field.head])

		const caret = read.offsets[1] ?? read.offsets[0] ?? null

		const diff = textChange(blockText(block.node), read.text, caret)

		const text = diff ? read.text.slice(diff.start, diff.endB) : ''

		// The browser makes no line break and no atom, so a change that holds one is not an edit of the reader.
		const change = diff && !text.includes(LEAF) ? diff : null

		if (change) changes.push({ block, change, text })

		read.offsets.forEach((offset, index) => {
			if (offset !== null) found[index] = { block, change, offset }
		})
	}

	const [anchor = null, head = anchor] = found.filter((point) => point !== null)

	return { changes, anchor, head }
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
function typedAtCaret({ changes, anchor, head }: ReturnType<typeof readEdits>): BlockChange | null {
	const [only] = changes

	if (changes.length !== 1 || !only || only.change.endA !== only.change.start) return null

	const after = (point: BlockPoint | null) =>
		point?.block === only.block && point.offset === only.change.endB

	return after(anchor) && after(head) ? only : null
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
		const at = typed.block.start + typed.change.start

		view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, at)))

		for (const char of typed.text) typeText(view, char)

		return
	}

	const tr = view.state.tr

	// From the last change to the first, so each change keeps the positions of the ones before it.
	for (const { block, change, text } of edits.changes.toReversed()) {
		replaceText(tr, block.start + change.start, block.start + change.endA, text)
	}

	const { anchor, head } = edits

	if (anchor && head) {
		const $anchor = tr.doc.resolve(mapPoint(tr, anchor))

		tr.setSelection(TextSelection.between($anchor, tr.doc.resolve(mapPoint(tr, head))))
	}

	if (tr.docChanged || tr.selectionSet) view.dispatch(tr)
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
		case 'paste':
			if (item.html) view.pasteHTML(item.html)
			else view.pasteText(item.text)

			return
		case 'format':
			wysiwygCommands[item.action].run(view.state, view.dispatch)

			return
		case 'history':
			;(item.redo ? redo : undo)(view.state, view.dispatch)

			return
		case 'delete': {
			const { selection } = view.state

			if (!selection.empty) {
				view.dispatch(view.state.tr.deleteSelection().scrollIntoView())

				return
			}

			// A delete at the edge of a block, such as a join, is a command of the editor.
			if (key({ key: item.forward ? 'Delete' : 'Backspace' })) return

			const { $from, from } = selection

			const size = unitSize(blockText($from.parent), $from.parentOffset, item.forward, item.unit)

			if (size === 0) return

			const tr = item.forward
				? view.state.tr.delete(from, from + size)
				: view.state.tr.delete(from - size, from)

			view.dispatch(tr.scrollIntoView())
		}
	}
}
