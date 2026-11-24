import { exitCode, lift, setBlockType, toggleMark, wrapIn } from 'prosemirror-commands'
import type { Mark, MarkType, Node, NodeType, ResolvedPos } from 'prosemirror-model'
import { liftListItem, wrapInList } from 'prosemirror-schema-list'
import {
	type Command,
	type EditorState,
	Selection,
	TextSelection,
	type Transaction,
} from 'prosemirror-state'
import type { WysiwygToggleAction } from '../types'
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
 * The nearest ancestor around the selection that has one of `types`, and its
 * depth, or `null`.
 *
 * @internal
 */
function ancestor(
	state: EditorState,
	types: readonly NodeType[],
): { node: Node; depth: number } | null {
	const { $from } = state.selection

	for (let depth = $from.depth; depth > 0; depth--) {
		const node = $from.node(depth)

		if (types.includes(node.type)) return { node, depth }
	}

	return null
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
	const nearest = (state: EditorState) => ancestor(state, [type, other])

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
		ancestor(state, [nodes.blockquote])
			? lift(state, dispatch)
			: wrapIn(nodes.blockquote)(state, dispatch),
	active: (state) => ancestor(state, [nodes.blockquote]) !== null,
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
 * The command of each toggle action. The link action needs a URL, so the
 * link popover runs {@link setLink}, and {@link isLinkActive} is its active
 * test.
 *
 * @internal
 */
export const wysiwygCommands: Record<WysiwygToggleAction, WysiwygCommand> = {
	bold: markCommand(marks.strong),
	italic: markCommand(marks.em),
	strike: markCommand(marks.strike),
	code: markCommand(marks.code),
	bulletList: listCommand(nodes.bullet_list),
	orderedList: listCommand(nodes.ordered_list),
	quote,
	codeBlock,
}

/**
 * Whether the selection is in a link: a range that has the link mark on the
 * whole of it, or a caret in a link.
 *
 * @internal
 */
export function isLinkActive(state: EditorState): boolean {
	return isMarkActive(state, marks.link) || linkAtCaret(state) !== null
}

/**
 * The link mark at a position. A link is not inclusive, so the marks of a
 * position hold it only inside the link. At the start of a link, the text
 * after the position gives it.
 *
 * @internal
 */
function linkMark($pos: ResolvedPos): Mark | undefined {
	return marks.link.isInSet($pos.marks()) ?? marks.link.isInSet($pos.nodeAfter?.marks ?? [])
}

/**
 * The link around a collapsed selection: the run of text with the same link
 * mark on each side of the caret. `null` when the caret is not in a link.
 *
 * @internal
 */
function linkAtCaret(state: EditorState): { from: number; to: number; href: string } | null {
	const { $from, empty } = state.selection

	if (!empty) return null

	const mark = linkMark($from)

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
 * The text and the URL of the range of the link action, for the fields of the
 * link popover. The blocks of a range join with a space, as the text field has
 * one line.
 *
 * @internal
 */
export function linkDraft(state: EditorState): { text: string; href: string } {
	const { from, to } = linkRange(state)

	const mark = linkMark(state.selection.$from)

	return { text: state.doc.textBetween(from, to, ' '), href: mark?.attrs.href ?? '' }
}

/**
 * Sets the text and the link of the range of the link action. An empty URL
 * removes the link, and an empty text is the URL.
 *
 * When the text is the text of the range, only the link changes, so the other
 * marks of the text and the inline atoms stay. Else the new text replaces the
 * range, and it keeps the marks of the start of the range. At a caret outside
 * a link, the text goes in at the caret. A selection then selects the new
 * text, and a caret goes after it.
 *
 * @internal
 */
export function setLink(href: string, text: string): Command {
	return (state, dispatch) => {
		const { from, to } = linkRange(state)

		const current = state.doc.textBetween(from, to, ' ')

		const label = text === '' ? current || href : text

		if (label === '') return false

		if (!dispatch) return true

		const mark = href === '' ? null : marks.link.create({ href })

		const tr =
			from !== to && label === current
				? relink(state.tr, from, to, mark)
				: writeLink(state, from, to, label, mark)

		dispatch(tr.scrollIntoView())

		return true
	}
}

/** Sets the link of a range, or removes it with no mark. Each other mark stays. @internal */
function relink(tr: Transaction, from: number, to: number, mark: Mark | null): Transaction {
	tr.removeMark(from, to, marks.link)

	return mark ? tr.addMark(from, to, mark) : tr
}

/**
 * Replaces a range with the text of a link. The text takes the marks of the
 * start of the range. A selection then selects the text, and a caret goes
 * after it.
 *
 * @internal
 */
function writeLink(
	state: EditorState,
	from: number,
	to: number,
	label: string,
	mark: Mark | null,
): Transaction {
	const $from = state.doc.resolve(from)

	const start =
		from === to ? (state.storedMarks ?? $from.marks()) : (state.doc.nodeAt(from)?.marks ?? [])

	const own = marks.link.removeFromSet(start)

	// The block takes only the marks that it allows, so a code block takes no link.
	const set = $from.parent.type.allowedMarks(mark ? mark.addToSet(own) : own)

	const tr = state.tr.replaceWith(from, to, schema.text(label, set))

	const end = from + label.length

	return tr.setSelection(
		state.selection.empty
			? TextSelection.create(tr.doc, end)
			: TextSelection.create(tr.doc, from, end),
	)
}
