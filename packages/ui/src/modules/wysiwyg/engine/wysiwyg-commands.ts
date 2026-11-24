import { exitCode, lift, setBlockType, toggleMark, wrapIn } from 'prosemirror-commands'
import type { MarkType, NodeType } from 'prosemirror-model'
import { liftListItem, wrapInList } from 'prosemirror-schema-list'
import { type Command, type EditorState, Selection, TextSelection } from 'prosemirror-state'
import type { WysiwygAction } from '../types'
import { schema } from './wysiwyg-schema'

/**
 * The command of an action and its active test. A command runs on the
 * selection and gives `false` when it cannot apply, as each ProseMirror
 * command does.
 *
 * @internal
 */
export type WysiwygCommand = {
	run: Command
	/** Whether the action is on at the selection, for `aria-pressed`. */
	active: (state: EditorState) => boolean
}

const { nodes, marks } = schema

/** @internal */
function markCommand(type: MarkType): WysiwygCommand {
	return { run: toggleMark(type), active: (state) => isMarkActive(state, type) }
}

/**
 * Whether a mark is on at the selection: in the stored marks of a caret, or on
 * the whole of a range.
 *
 * @internal
 */
export function isMarkActive(state: EditorState, type: MarkType): boolean {
	const { from, to, empty, $from } = state.selection

	if (empty) return Boolean(type.isInSet(state.storedMarks ?? $from.marks()))

	let all = true

	let text = false

	state.doc.nodesBetween(from, to, (node) => {
		if (!node.isInline) return true

		text = true

		if (!type.isInSet(node.marks)) all = false

		return false
	})

	return text && all
}

/**
 * The depth of the nearest ancestor of a type around the selection, or `-1`.
 *
 * @internal
 */
function ancestorDepth(state: EditorState, type: NodeType): number {
	const { $from } = state.selection

	for (let depth = $from.depth; depth > 0; depth--) {
		if ($from.node(depth).type === type) return depth
	}

	return -1
}

/**
 * A list action: it lifts the items out of a list of its kind, changes a list
 * of the other kind to its kind, or wraps the blocks in a new list.
 *
 * @internal
 */
function listCommand(type: NodeType): WysiwygCommand {
	const other = type === nodes.bullet_list ? nodes.ordered_list : nodes.bullet_list

	// The nearest list decides: an item of a list in a list of the other kind is
	// in the inner list.
	const nearest = (state: EditorState) => {
		const { $from } = state.selection

		for (let depth = $from.depth; depth > 0; depth--) {
			const node = $from.node(depth)

			if (node.type === type || node.type === other) return { node, depth }
		}

		return null
	}

	return {
		run: (state, dispatch) => {
			const list = nearest(state)

			if (list?.node.type === type) return liftListItem(nodes.list_item)(state, dispatch)

			if (list) {
				if (dispatch) {
					const at = state.selection.$from.before(list.depth)

					dispatch(state.tr.setNodeMarkup(at, type, { tight: list.node.attrs.tight }))
				}

				return true
			}

			return wrapInList(type)(state, dispatch)
		},
		active: (state) => nearest(state)?.node.type === type,
	}
}

/** @internal */
const quote: WysiwygCommand = {
	run: (state, dispatch) =>
		ancestorDepth(state, nodes.blockquote) >= 0
			? lift(state, dispatch)
			: wrapIn(nodes.blockquote)(state, dispatch),
	active: (state) => ancestorDepth(state, nodes.blockquote) >= 0,
}

/**
 * Makes the blocks of the selection a code block, or a code block a paragraph.
 * A code block holds text only, so each inline atom in the selection, such as
 * an image, becomes its source as text, and no text goes. A line break becomes
 * a newline of the code, through the `linebreakReplacement` of the schema.
 *
 * @internal
 */
const codeBlock: WysiwygCommand = {
	run: (state, dispatch) => {
		if (state.selection.$from.parent.type === nodes.code_block) {
			return setBlockType(nodes.paragraph)(state, dispatch)
		}

		if (!setBlockType(nodes.code_block)(state)) return false

		if (!dispatch) return true

		const { from, to } = state.selection

		const tr = state.tr

		const atoms: { pos: number; source: string }[] = []

		// Each textblock that the selection touches changes as a whole.
		state.doc.nodesBetween(from, to, (node, pos) => {
			if (!node.isTextblock) return true

			node.forEach((child, offset) => {
				if (child.type === nodes.raw_inline) {
					atoms.push({ pos: pos + 1 + offset, source: child.attrs.source })
				}
			})

			return false
		})

		// The last atom first, so the positions of the others stay.
		for (const { pos, source } of atoms.reverse()) {
			tr.replaceWith(pos, pos + 1, schema.text(source))
		}

		tr.setBlockType(tr.mapping.map(from), tr.mapping.map(to), nodes.code_block)

		dispatch(tr.scrollIntoView())

		return true
	},
	active: (state) => state.selection.$from.parent.type === nodes.code_block,
}

/**
 * Leaves a code block on a new line at its end, as a new item leaves a list
 * when it is empty. With the caret after an empty last line, the command
 * removes that line and puts a paragraph after the block. An empty code block
 * becomes a paragraph. Each other new line stays in the code.
 *
 * @internal
 */
export const exitCodeOnEmptyLine: Command = (state, dispatch) => {
	const { $head, empty } = state.selection

	const code = $head.parent

	if (!empty || !code.type.spec.code || $head.parentOffset !== code.content.size) return false

	if (code.content.size === 0) return setBlockType(nodes.paragraph)(state, dispatch)

	if (!code.textContent.endsWith('\n')) return false

	if (dispatch) {
		const tr = state.tr.delete($head.pos - 1, $head.pos)

		const after = tr.mapping.map($head.after())

		tr.insert(after, nodes.paragraph.create())

		dispatch(tr.setSelection(TextSelection.create(tr.doc, after + 1)).scrollIntoView())
	}

	return true
}

/**
 * Leaves a code block on ArrowDown from its last line when no block comes
 * after it, so the caret has a place below the block. The command puts a
 * paragraph after the block. ArrowDown elsewhere moves the caret as usual.
 *
 * @internal
 */
export const exitCodeDown: Command = (state, dispatch, view) => {
	const { $head, empty } = state.selection

	if (!empty || !$head.parent.type.spec.code || !view?.endOfTextblock('down')) return false

	if (Selection.findFrom(state.doc.resolve($head.after()), 1)) return false

	return exitCode(state, dispatch)
}

/**
 * The command of each action but `link`, which needs a URL and opens a
 * popover. `link` has the active test and the removal of a link.
 *
 * @internal
 */
export const wysiwygCommands: Record<WysiwygAction, WysiwygCommand> = {
	bold: markCommand(marks.strong),
	italic: markCommand(marks.em),
	strike: markCommand(marks.strike),
	code: markCommand(marks.code),
	link: {
		run: (state, dispatch) => {
			if (!isMarkActive(state, marks.link) && !linkAtCaret(state)) return false

			const range = linkRange(state)

			if (dispatch) dispatch(state.tr.removeMark(range.from, range.to, marks.link))

			return true
		},
		active: (state) => isMarkActive(state, marks.link) || linkAtCaret(state) !== null,
	},
	bulletList: listCommand(nodes.bullet_list),
	orderedList: listCommand(nodes.ordered_list),
	quote,
	codeBlock,
}

/**
 * The link around a collapsed selection: the run of text with the same link
 * mark on each side of the caret. `null` when the caret is not in a link.
 *
 * @internal
 */
export function linkAtCaret(state: EditorState): { from: number; to: number; href: string } | null {
	const { $from, empty } = state.selection

	if (!empty) return null

	const mark = marks.link.isInSet($from.marks()) ?? marks.link.isInSet($from.nodeAfter?.marks ?? [])

	if (!mark) return null

	// The runs of text that carry the mark, as ranges of the doc.
	const runs: { from: number; to: number }[] = []

	$from.parent.forEach((child, offset) => {
		const at = $from.start() + offset

		if (!mark.isInSet(child.marks)) return

		const last = runs.at(-1)

		if (last && last.to === at) last.to = at + child.nodeSize
		else runs.push({ from: at, to: at + child.nodeSize })
	})

	const run = runs.find((each) => each.from <= $from.pos && $from.pos <= each.to)

	return run ? { ...run, href: mark.attrs.href } : null
}

/**
 * The range of a link action: the selection, or the link around a caret.
 *
 * @internal
 */
export function linkRange(state: EditorState): { from: number; to: number } {
	const { from, to, empty } = state.selection

	return empty ? (linkAtCaret(state) ?? { from, to }) : { from, to }
}

/**
 * Sets a link on the range of the link action. With a caret outside a link,
 * it inserts the URL as the text of the link.
 *
 * @internal
 */
export function setLink(href: string): Command {
	return (state, dispatch) => {
		const range = linkRange(state)

		const mark = marks.link.create({ href })

		if (dispatch) {
			const tr = state.tr

			if (range.from === range.to) {
				tr.insert(range.from, schema.text(href, [mark]))
			} else {
				tr.removeMark(range.from, range.to, marks.link).addMark(range.from, range.to, mark)
			}

			dispatch(tr.scrollIntoView())
		}

		return true
	}
}
