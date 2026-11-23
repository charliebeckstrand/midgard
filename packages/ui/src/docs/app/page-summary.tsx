import { Fragment } from 'react'
import { Text } from 'ui/text'
import { dan } from '../../recipes/kiso/index.ts'
import { keyByOccurrence } from '../../utilities/key-by-occurrence.ts'
import { TSDOC } from '../kit/tsdoc.ts'
import type { SummaryPart } from '../plugin/summaries.ts'

/** The source of a part, as its key reads it: a code span keeps its backticks, so it differs from the same text. */
function toSource(part: SummaryPart): string {
	return typeof part === 'string' ? part : `\`${part.code}\``
}

/**
 * The summary of a page under its title, in muted text: the first sentence of
 * the TSDoc of its base component (`plugin/summaries.ts`). Each code span is a
 * plain `<code>` in the muted ink, as in the HTML note of the API reference. A
 * `Code` mark puts a wash of the ink behind the text, and the muted ink on
 * that wash fails the AA contrast. The TSDoc stays English, so the sentence has
 * the language and the direction of {@link TSDOC}. The paragraph keeps the
 * direction of the page, so the sentence starts at the start edge.
 *
 * The summary is between the header and the body of the layout, so the sticky
 * header keeps one row. The bottom padding of the header is the gap above the
 * summary. The summary has the same padding at its bottom, so each gap is the
 * padding of the shell, as at the sides and above the title, at each density
 * step.
 */
export function PageSummary({ summary }: { summary: readonly SummaryPart[] }) {
	const keys = keyByOccurrence(summary.map(toSource))

	return (
		<Text tone="muted" className={dan.space.shell.bottom}>
			<span {...TSDOC}>
				{summary.map((part, index) => {
					const key = keys[index]?.key

					return typeof part === 'string' ? (
						<Fragment key={key}>{part}</Fragment>
					) : (
						<code key={key}>{part.code}</code>
					)
				})}
			</span>
		</Text>
	)
}
