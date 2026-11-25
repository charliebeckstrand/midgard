import {
	InputRule,
	inputRules,
	textblockTypeInputRule,
	wrappingInputRule,
} from 'prosemirror-inputrules'
import type { Mark, MarkType, Node as ProseMirrorNode } from 'prosemirror-model'
import {
	type Command,
	type EditorState,
	type Plugin,
	TextSelection,
	type Transaction,
} from 'prosemirror-state'
import { DELIMITERS } from './wysiwyg-markdown/serialize'
import { schema } from './wysiwyg-schema'

const { nodes, marks } = schema

/**
 * A rule that turns a delimited run into a mark as the reader types its
 * closing delimiter, such as `**bold**`. The regular expression has two
 * groups: the opening delimiter and the text. A lookbehind tests the
 * character before the opening delimiter, so the match starts at it. The rule
 * does not run on an opening delimiter in a code span. The next character
 * that the reader types has no mark.
 *
 * @internal
 */
function markRule(pattern: RegExp, type: MarkType): InputRule {
	return new InputRule(pattern, (state, match, start, end) => {
		const [, open = '', text = ''] = match

		if (marks.code.isInSet(state.doc.nodeAt(start)?.marks ?? [])) return null

		const textFrom = start + open.length

		const textTo = textFrom + text.length

		const tr = state.tr

		// In Markdown, a code span binds tighter than emphasis, and a backtick
		// opens a span only when a later backtick closes it. Thus the code rule
		// gives back the delimiters of each emphasis that the reader made in the
		// span before it closed, such as the `*` of `2*3*4`.
		const source = type === marks.code ? typedSource(state.doc, textFrom, textTo) : null

		if (source) tr.replaceWith(textFrom, textTo, source)

		const length = tr.mapping.map(textTo) - textFrom

		// The last character of the closing delimiter is the typed one, which is
		// not yet in the doc, so the doc holds the closing delimiter up to `end`.
		return tr
			.delete(textFrom + length, tr.mapping.map(end))
			.delete(start, textFrom)
			.addMark(start, start + length, type.create())
			.removeStoredMark(type)
	})
}

/**
 * The text from `from` to `to` in one textblock, with each emphasis mark that
 * not all of it has written back as its delimiters, as the reader typed it.
 * The text keeps the marks that all of it has. A span that holds a node that
 * is not text, such as a line break, has none, and keeps its nodes.
 *
 * @internal
 */
function typedSource(doc: ProseMirrorNode, from: number, to: number): ProseMirrorNode | null {
	const runs: { text: string; marks: readonly Mark[] }[] = []

	let plain = true

	doc.nodesBetween(from, to, (node, pos) => {
		if (node.isInline && !node.isText) plain = false

		if (!node.isText) return

		const text = (node.text ?? '').slice(Math.max(0, from - pos), to - pos)

		if (text) runs.push({ text, marks: node.marks })
	})

	if (!plain || runs.length === 0) return null

	const shared = runs.reduce<readonly Mark[]>(
		(set, run) => set.filter((mark) => mark.isInSet(run.marks)),
		runs[0]?.marks ?? [],
	)

	const delimited = [...DELIMITERS.keys()].filter((type) => !type.isInSet(shared))

	let source = ''

	let open: MarkType[] = []

	for (const run of [...runs, { text: '', marks: [] }]) {
		const active = delimited.filter((type) => type.isInSet(run.marks))

		let keep = 0

		while (keep < open.length && open[keep] === active[keep]) keep++

		for (const type of open.slice(keep).reverse()) source += DELIMITERS.get(type)

		for (const type of active.slice(keep)) source += DELIMITERS.get(type)

		source += run.text

		open = active
	}

	return schema.text(source, shared)
}

/**
 * A fence at the start of a block, such as ```` ```js ````, and the white space
 * that ends it. The group is the language.
 *
 * @internal
 */
const FENCE = /^```([a-z0-9+#-]*)\s$/i

/**
 * Makes the block of a fence a code block with the language of the fence, and
 * deletes the fence from `start` to `end`. The text after the fence stays, as
 * the code. A block where a code block cannot go, such as the first block of a
 * list item, stays as it is.
 *
 * @internal
 */
function fenceToCodeBlock(
	state: EditorState,
	match: RegExpMatchArray,
	start: number,
	end: number,
): Transaction | null {
	const $start = state.doc.resolve(start)

	if (!$start.node(-1).canReplaceWith($start.index(-1), $start.indexAfter(-1), nodes.code_block)) {
		return null
	}

	return state.tr
		.delete(start, end)
		.setBlockType(start, start, nodes.code_block, { lang: match[1] ?? '' })
}

/**
 * The fence rule on Enter. Enter ends a fence as a space does, so a block that
 * holds ```` ```js ```` before the caret becomes a code block, and the key does
 * nothing more. The command does not run in a code block, as the input rules do
 * not.
 *
 * @internal
 */
export const fenceOnEnter: Command = (state, dispatch) => {
	const $cursor = state.selection instanceof TextSelection ? state.selection.$cursor : null

	if (!$cursor || $cursor.parent.type.spec.code) return false

	const text = $cursor.parent.textBetween(0, $cursor.parentOffset, null, '\ufffc')

	const match = FENCE.exec(`${text}\n`)

	const tr = match && fenceToCodeBlock(state, match, $cursor.start(), $cursor.pos)

	if (!tr) return false

	dispatch?.(tr.scrollIntoView())

	return true
}

/**
 * The live Markdown shortcuts of a Wysiwyg. A delimited run becomes its mark
 * when the closing delimiter is typed. A marker and a space at the start of a
 * block, such as `- `, `1. `, `> `, or `# `, make the block, and a fence makes a
 * code block. {@link fenceOnEnter} runs the fence rule on Enter. A Backspace
 * right after a typed rule undoes it, through `undoInputRule` in the keymap.
 *
 * @internal
 */
export function wysiwygInputRules(): Plugin {
	return inputRules({
		rules: [
			markRule(/(?<!\*)(\*\*)([^*\s](?:[^*]*[^*\s])?)\*\*$/, marks.strong),
			markRule(/(?<!\w)(__)([^_\s](?:[^_]*[^_\s])?)__$/, marks.strong),
			markRule(/(?<!\*)(\*)([^*\s](?:[^*]*[^*\s])?)\*$/, marks.em),
			markRule(/(?<!\w)(_)([^_\s](?:[^_]*[^_\s])?)_$/, marks.em),
			markRule(/(?<!~)(~~)([^~\s](?:[^~]*[^~\s])?)~~$/, marks.strike),
			markRule(/(?<!`)(`)([^`]+)`$/, marks.code),
			wrappingInputRule(/^\s*([-+*])\s$/, nodes.bullet_list),
			wrappingInputRule(
				/^(\d+)\.\s$/,
				nodes.ordered_list,
				(match) => ({ start: Number(match[1]) }),
				(match, node) => node.childCount + node.attrs.start === Number(match[1]),
			),
			wrappingInputRule(/^>\s$/, nodes.blockquote),
			new InputRule(FENCE, fenceToCodeBlock),
			textblockTypeInputRule(/^(#{1,6})\s$/, nodes.heading, (match) => ({
				level: match[1]?.length ?? 1,
			})),
		],
	})
}
