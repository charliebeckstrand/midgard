import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { BarChart } from '../../modules/chart'
import {
	type ChatCitation,
	ChatCitationProvider,
	type ChatCitationTrigger,
	ChatMessage,
	toCategorySelection,
} from '../../modules/chat'
import { renderUI } from '../helpers'
import { CHART_RECEDE } from '../helpers/recede'

const SOURCE =
	'Late stops rose from **4** to **14**, most on Tuesday. See [the log](https://example.com).'

const QUOTE = 'from **4** to **14**'

const CITATION: ChatCitation = {
	id: 'c1',
	start: SOURCE.indexOf(QUOTE),
	end: SOURCE.indexOf(QUOTE) + QUOTE.length,
	quote: QUOTE,
	target: 'late-by-day',
	selector: { categories: ['Tue'] },
}

const DATA = [
	{ day: 'Mon', late: 4 },
	{ day: 'Tue', late: 14 },
]

const targets = { 'late-by-day': { label: 'Late stops by day' } }

/** A chat beside a chart, as a dashboard holds them. */
function Dashboard({
	trigger,
	onPreviewChange,
}: {
	trigger?: ChatCitationTrigger
	onPreviewChange?: (citation: ChatCitation | null) => void
}) {
	const [cited, setCited] = useState<ChatCitation | null>(null)

	const [previewed, setPreviewed] = useState<ChatCitation | null>(null)

	// A preview shows over the cited citation.
	const shown = previewed ?? cited

	return (
		<>
			<ChatCitationProvider
				targets={targets}
				trigger={trigger}
				cited={cited}
				onCitedChange={setCited}
				onPreviewChange={(citation) => {
					onPreviewChange?.(citation)

					setPreviewed(citation)
				}}
			>
				<ChatMessage sender="assistant">
					{[{ kind: 'text', id: 't1', text: SOURCE, citations: [CITATION] }]}
				</ChatMessage>
			</ChatCitationProvider>
			<BarChart
				aria-label="Late stops by day"
				data={DATA}
				series={[{ xKey: 'day', yKey: 'late', yName: 'Late stops' }]}
				width={400}
				selectedCategories={
					shown?.target === 'late-by-day' ? toCategorySelection(shown.selector) : undefined
				}
			/>
		</>
	)
}

/**
 * A citation in a reply selects the categories it names in a chart beside the
 * chat. The citation crosses bold, and it is one tab stop.
 */
describe('Chat: a citation selects in a chart', () => {
	it('is one tab stop before the link, and a press selects its categories', async () => {
		const { container } = renderUI(<Dashboard />)

		const bars = () => container.querySelector('[data-slot="chart-bar"]')

		expect(bars()?.getAttribute('class')).not.toContain(CHART_RECEDE)

		await userEvent.keyboard('{Tab}')

		expect(document.activeElement?.getAttribute('data-slot')).toBe('chat-citation')

		// The citation crosses bold, and the browser names its control by the whole phrase.
		await expect.element(page.getByRole('button', { name: 'from 4 to 14' })).toHaveFocus()

		await userEvent.keyboard('{Enter}')

		expect(document.activeElement).toBePressed()

		expect(bars()?.getAttribute('class')).toContain(CHART_RECEDE)

		await userEvent.keyboard('{Tab}')

		expect(document.activeElement?.tagName).toBe('A')
	})

	it('previews on a hover across the pieces of the citation, and a click cites it', async () => {
		const onPreviewChange = vi.fn()

		const { container } = renderUI(
			<Dashboard trigger={['hover', 'click']} onPreviewChange={onPreviewChange} />,
		)

		const bars = () => container.querySelector('[data-slot="chart-bar"]')

		const anchor = page.getByRole('button', { name: 'from 4 to 14' })

		const pieces = container.querySelectorAll('[data-slot="chat-citation-piece"]')

		await userEvent.hover(anchor)

		expect(bars()?.getAttribute('class')).toContain(CHART_RECEDE)

		// The pointer that moves through the bold pieces stays on the citation.
		for (const piece of pieces) await userEvent.hover(piece)

		expect(onPreviewChange).toHaveBeenCalledTimes(1)

		await userEvent.hover(page.getByRole('link'))

		expect(onPreviewChange).toHaveBeenLastCalledWith(null)

		expect(bars()?.getAttribute('class')).not.toContain(CHART_RECEDE)

		await userEvent.click(anchor)

		await userEvent.hover(page.getByRole('link'))

		await expect.element(anchor).toBePressed()

		expect(bars()?.getAttribute('class')).toContain(CHART_RECEDE)
	})
})
