import {
	InputRule,
	inputRules,
	textblockTypeInputRule,
	wrappingInputRule,
} from 'prosemirror-inputrules'
import type { Mark, MarkType, Node as ProseMirrorNode } from 'prosemirror-model'
import type { Plugin } from 'prosemirror-state'
import { schema } from './wysiwyg-schema'

const { nodes, marks } = schema

/**
 * A rule that turns a delimited run into a mark as the reader types its
 * closing delimiter, such as `**bold**`. The regular expression has three
 * groups: the character before the opening delimiter (or nothing at the start
 * of the block), the opening delimiter, and the text. The rule does not run in
 * a code span. The next character that the reader types has no mark.
 *
 * @internal
 */
function markRule(pattern: RegExp, type: MarkType): InputRule {
	return new InputRule(pattern, (state, match, start, end) => {
		const [, before = '', open = '', text = ''] = match

		if (marks.code.isInSet(state.doc.resolve(start).marks()) && type !== marks.code) return null

		const from = start + before.length

		const textFrom = from + open.length

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
			.delete(from, textFrom)
			.addMark(from, from + length, type.create())
			.removeStoredMark(type)
	})
}

/** The delimiter that the serializer writes for each emphasis mark, in the order of the schema. */
const DELIMITERS: ReadonlyMap<MarkType, string> = new Map([
	[marks.strong, '**'],
	[marks.em, '*'],
	[marks.strike, '~~'],
])

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
 * The live Markdown shortcuts of a Wysiwyg. A delimited run becomes its mark
 * when the closing delimiter is typed. A marker and a space at the start of a
 * block, such as `- `, `1. `, `> `, or `# `, make the block, and a fence makes a
 * code block. A Backspace right after a rule undoes it, through
 * `undoInputRule` in the keymap.
 *
 * @internal
 */
export function wysiwygInputRules(): Plugin {
	return inputRules({
		rules: [
			markRule(/(^|[^*])(\*\*)([^*\s](?:[^*]*[^*\s])?)\*\*$/, marks.strong),
			markRule(/(^|[^\w_])(__)([^_\s](?:[^_]*[^_\s])?)__$/, marks.strong),
			markRule(/(^|[^*])(\*)([^*\s](?:[^*]*[^*\s])?)\*$/, marks.em),
			markRule(/(^|[^\w_])(_)([^_\s](?:[^_]*[^_\s])?)_$/, marks.em),
			markRule(/(^|[^~])(~~)([^~\s](?:[^~]*[^~\s])?)~~$/, marks.strike),
			markRule(/(^|[^`])(`)([^`]+)`$/, marks.code),
			wrappingInputRule(/^\s*([-+*])\s$/, nodes.bullet_list),
			wrappingInputRule(
				/^(\d+)\.\s$/,
				nodes.ordered_list,
				(match) => ({ start: Number(match[1]) }),
				(match, node) => node.childCount + node.attrs.start === Number(match[1]),
			),
			wrappingInputRule(/^>\s$/, nodes.blockquote),
			textblockTypeInputRule(/^```([a-z0-9+#-]*)\s$/i, nodes.code_block, (match) => ({
				lang: match[1] ?? '',
			})),
			textblockTypeInputRule(/^(#{1,6})\s$/, nodes.heading, (match) => ({
				level: match[1]?.length ?? 1,
			})),
		],
	})
}
