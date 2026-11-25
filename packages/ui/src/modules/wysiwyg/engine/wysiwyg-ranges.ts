import type { Node } from 'prosemirror-model'
import { Plugin, type Transaction } from 'prosemirror-state'
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
 * The rule of the ranges of a field, as a composer holds its citations. A
 * change that touches a range removes its mark, and its text stays as prose.
 * A range is touched when the text from its first piece to the end of its last
 * piece changes: an edit in it, a split of its block, or text between its
 * pieces. A range that the change brings back, such as an undo, stays.
 *
 * @internal
 */
export function wysiwygRanges(): Plugin {
	return new Plugin({
		appendTransaction: (transactions, before, after) => {
			if (!transactions.some((tr) => tr.docChanged)) return null

			const previous = rangeSpans(before.doc)

			// An edit removes a mark only from a range that the doc held before it.
			if (previous.size === 0) return null

			let tr: Transaction | null = null

			for (const [id, span] of rangeSpans(after.doc)) {
				const old = previous.get(id)

				if (!old || spanText(before.doc, old) === spanText(after.doc, span)) continue

				tr ??= after.tr

				tr.removeMark(span.from, span.to, schema.marks.range.create({ id }))
			}

			return tr
		},
	})
}
