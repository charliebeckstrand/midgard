import { Markdown, type MarkdownRange, type MarkdownRangeRenderer } from 'ui/markdown'

// Each piece is a run of the source, and a piece with `highlight` is a range.
// The offsets come from the pieces, so they stay correct in each language.
const pieces = [
	{ text: 'The new plan costs ' },
	{ text: '**$12** for each seat', highlight: true },
	{ text: '. It includes the shared folders, and the search finds ' },
	{ text: 'the text in attachments', highlight: true },
	{ text: '.' },
]

const source = pieces.map((piece) => piece.text).join('')

const ranges: MarkdownRange[] = []

let offset = 0

for (const piece of pieces) {
	const end = offset + piece.text.length

	if (piece.highlight) {
		ranges.push({ id: String(ranges.length), start: offset, end, quote: piece.text })
	}

	offset = end
}

// `renderRange` draws each piece of a range. The function and the ranges stay
// the same from render to render, because the block is memoized on its props.
const renderRange: MarkdownRangeRenderer = (_piece, children) => (
	<mark className="rounded-sm bg-amber-200 dark:bg-amber-500/30 dark:text-white">{children}</mark>
)

export default function Highlights() {
	return (
		<Markdown ranges={ranges} renderRange={renderRange}>
			{source}
		</Markdown>
	)
}
