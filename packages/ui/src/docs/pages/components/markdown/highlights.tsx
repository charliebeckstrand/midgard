import { Markdown, type MarkdownRange, type MarkdownRangeRenderer } from 'ui/markdown'

const SOURCE = `The new plan costs **$12** for each seat. It includes the shared folders,
and the search finds the text in attachments.`

// Each range gives the offsets of a phrase in the source, and its `quote`.
const quotes = ['**$12** for each seat', 'the text in attachments']

const ranges: MarkdownRange[] = quotes.map((quote, index) => {
	const start = SOURCE.indexOf(quote)

	return { id: String(index), start, end: start + quote.length, quote }
})

// `renderRange` draws each piece of a range. The function and the ranges stay
// the same from render to render, because the block is memoized on its props.
const renderRange: MarkdownRangeRenderer = (_piece, children) => (
	<mark className="rounded-sm bg-amber-200 dark:bg-amber-500/30 dark:text-white">{children}</mark>
)

export default function Highlights() {
	return (
		<Markdown ranges={ranges} renderRange={renderRange}>
			{SOURCE}
		</Markdown>
	)
}
