import type { Node, Slice } from 'prosemirror-model'
import { type EditorState, Plugin, PluginKey, type Transaction } from 'prosemirror-state'
import {
	AddMarkStep,
	AddNodeMarkStep,
	ReplaceAroundStep,
	ReplaceStep,
	type Step,
} from 'prosemirror-transform'
import { schema } from './wysiwyg-schema'

/** The span of a range in a doc: from its first piece to the end of its last piece. @internal */
type RangeSpan = { from: number; to: number }

/**
 * The span of each range of a doc, by its id.
 *
 * @internal
 */
function rangeSpans(doc: Node): Map<string, RangeSpan> {
	const spans = new Map<string, RangeSpan>()

	doc.descendants((node, pos) => {
		const mark = schema.marks.range.isInSet(node.marks)

		if (!mark) return

		const span = spans.get(mark.attrs.id)

		if (span) span.to = pos + node.nodeSize
		else spans.set(mark.attrs.id, { from: pos, to: pos + node.nodeSize })
	})

	return spans
}

/**
 * The text of a span, with each line break and each block boundary as a
 * newline, and each inline atom as its source.
 *
 * @internal
 */
function spanText(doc: Node, { from, to }: RangeSpan): string {
	return doc.textBetween(from, to, '\n', (leaf) =>
		leaf.type === schema.nodes.hard_break ? '\n' : (leaf.attrs.source ?? ''),
	)
}

/**
 * The key of the plugin of the ranges. Its state is the span of each range of
 * the doc, by its id.
 *
 * @internal
 */
const rangesKey = new PluginKey<ReadonlyMap<string, RangeSpan>>('wysiwygRanges')

/** Whether a slice holds a range mark. @internal */
function sliceHoldsRange(slice: Slice): boolean {
	let found = false

	slice.content.descendants((node) => {
		if (found) return false

		if (schema.marks.range.isInSet(node.marks)) found = true

		return !found
	})

	return found
}

/**
 * Whether a step can add a range mark: a replace that inserts one, or an add of
 * one. No other step adds a mark.
 *
 * @internal
 */
function addsRange(step: Step): boolean {
	if (step instanceof ReplaceStep || step instanceof ReplaceAroundStep) {
		return sliceHoldsRange(step.slice)
	}

	if (step instanceof AddMarkStep || step instanceof AddNodeMarkStep) {
		return step.mark.type === schema.marks.range
	}

	return false
}

/**
 * Whether the doc of a state holds a range mark, as the plugin of the ranges
 * keeps it. A state with no such plugin reads its doc.
 *
 * @internal
 */
export function holdsRange(state: EditorState): boolean {
	return (rangesKey.getState(state) ?? rangeSpans(state.doc)).size > 0
}

/**
 * The rule of the ranges of a field, as a composer holds its citations. A
 * change that touches a range removes its mark, and its text stays as prose.
 * A range is touched when the text from its first piece to the end of its last
 * piece changes: an edit in it, a split of its block, or text between its
 * pieces. A range that the change brings back, such as an undo, stays.
 *
 * @internal
 */
export function wysiwygRanges(): Plugin<ReadonlyMap<string, RangeSpan>> {
	return new Plugin<ReadonlyMap<string, RangeSpan>>({
		key: rangesKey,
		// A doc with no range gets one only from a step that adds one, so an edit
		// of such a doc reads its steps and not the whole doc.
		state: {
			init: (_, state) => rangeSpans(state.doc),
			apply: (tr, spans) =>
				!tr.docChanged || (spans.size === 0 && !tr.steps.some(addsRange))
					? spans
					: rangeSpans(tr.doc),
		},
		appendTransaction: (transactions, before, after) => {
			const previous = rangesKey.getState(before)

			// An edit removes a mark only from a range that the doc held before it.
			if (!previous?.size || !transactions.some((tr) => tr.docChanged)) return null

			let tr: Transaction | null = null

			for (const [id, span] of rangesKey.getState(after) ?? []) {
				const old = previous.get(id)

				if (!old || spanText(before.doc, old) === spanText(after.doc, span)) continue

				tr ??= after.tr

				tr.removeMark(span.from, span.to, schema.marks.range.create({ id }))
			}

			return tr
		},
	})
}
