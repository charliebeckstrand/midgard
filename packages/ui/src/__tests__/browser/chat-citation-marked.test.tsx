import { useCallback, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { BarChart } from '../../modules/chart'
import {
	type ChatCitation,
	ChatCitationProvider,
	ChatMessage,
	toCategorySelection,
} from '../../modules/chat'
import { bySlot, renderUI } from '../helpers'

const SOURCE = 'Twelve stops are late, most on Tuesday.'

const QUOTE = 'most on Tuesday'

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
	{ day: 'Tue', late: 8 },
]

const targets = { 'late-by-day': { label: 'Late stops by day' } }

/**
 * A chat beside a chart that shows one selection at a time: a pick in the
 * chart clears the citation, and a citation clears the pick.
 */
function ChatBesideChart() {
	const [cited, setCited] = useState<ChatCitation | null>(null)

	const [picked, setPicked] = useState<string | null>(null)

	const cite = useCallback((citation: ChatCitation | null) => {
		setCited(citation)

		if (citation !== null) setPicked(null)
	}, [])

	const isMarked = useCallback(
		(citation: ChatCitation) =>
			picked !== null && (toCategorySelection(citation.selector) ?? []).includes(picked),
		[picked],
	)

	return (
		<>
			<ChatCitationProvider targets={targets} cited={cited} onCite={cite} isMarked={isMarked}>
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
					cited === null ? (picked === null ? [] : [picked]) : toCategorySelection(cited.selector)
				}
				onCategoryClick={(day) => {
					setCited(null)

					setPicked(String(day))
				}}
			/>
		</>
	)
}

/**
 * A pick in a view marks each citation that the pick matches. A press on the
 * marked citation makes it the active citation in place of the pick.
 */
describe('Chat: a pick in a chart marks the citation that it matches', () => {
	it('marks the phrase on a pick of its category, and a press turns the mark into the press', async () => {
		const { container } = renderUI(<ChatBesideChart />)

		const anchor = () => bySlot(container, 'chat-citation')

		expect(anchor()).not.toHaveAttribute('data-marked')

		// The first arrow puts the cursor on Mon, the second on Tue, and Enter picks it.
		bySlot(container, 'chart-plot')?.focus()

		await userEvent.keyboard('{ArrowRight}{ArrowRight}{Enter}')

		expect(anchor()).toHaveAttribute('data-marked')

		expect(anchor()).toHaveAttribute('aria-pressed', 'false')

		// A pick of Mon does not match, so the mark goes.
		await userEvent.keyboard('{ArrowLeft}{Enter}')

		expect(anchor()).not.toHaveAttribute('data-marked')

		// Back to Tue, then a press on the marked phrase replaces the pick.
		await userEvent.keyboard('{ArrowRight}{Enter}')

		expect(anchor()).toHaveAttribute('data-marked')

		await userEvent.click(anchor() as HTMLElement)

		expect(anchor()).toHaveAttribute('aria-pressed', 'true')

		expect(anchor()).not.toHaveAttribute('data-marked')
	})
})
