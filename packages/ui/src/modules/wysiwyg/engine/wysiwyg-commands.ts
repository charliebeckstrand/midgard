import { lift, setBlockType, toggleMark, wrapIn } from 'prosemirror-commands'
import type { MarkType, NodeType } from 'prosemirror-model'
import { liftListItem, wrapInList } from 'prosemirror-schema-list'
import type { Command, EditorState } from 'prosemirror-state'
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

/** @internal */
const codeBlock: WysiwygCommand = {
	run: (state, dispatch) =>
		state.selection.$from.parent.type === nodes.code_block
			? setBlockType(nodes.paragraph)(state, dispatch)
			: setBlockType(nodes.code_block)(state, dispatch),
	active: (state) => state.selection.$from.parent.type === nodes.code_block,
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
