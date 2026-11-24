import {
	InputRule,
	inputRules,
	textblockTypeInputRule,
	wrappingInputRule,
} from 'prosemirror-inputrules'
import type { MarkType } from 'prosemirror-model'
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

		// The last character of the closing delimiter is the typed one, which is
		// not yet in the doc, so the doc holds the closing delimiter up to `end`.
		return state.tr
			.delete(textTo, end)
			.delete(from, textFrom)
			.addMark(from, from + text.length, type.create())
			.removeStoredMark(type)
	})
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
