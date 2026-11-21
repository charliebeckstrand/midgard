import { useState } from 'react'
import { BarChart } from 'ui/chart'
import {
	type ChatCitation,
	ChatCitationProvider,
	type ChatMessageData,
	ChatTranscript,
	toCategorySelection,
} from 'ui/chat'
import { Stack } from 'ui/stack'
import { dayNames as day } from '../../../../data/calendar.ts'

const DAYS = [
	{ day: day.mon, late: 1 },
	{ day: day.tue, late: 7 },
	{ day: day.wed, late: 2 },
	{ day: day.thu, late: 1 },
	{ day: day.fri, late: 1 },
]

const phrase = { label: 'most of them on Tuesday' }

const reply = { text: `Twelve stops are late this week, and ${phrase.label}.` }

const { text } = reply

// The producer of a reply knows where the phrase is in its own text, so it
// gives the offsets and the quote. A citation draws only while the quote matches.
const citation: ChatCitation = {
	id: 'c1',
	start: text.indexOf(phrase.label),
	end: text.indexOf(phrase.label) + phrase.label.length,
	quote: phrase.label,
	target: 'late-by-day',
	selector: { categories: [day.tue] },
}

const messages: ChatMessageData[] = [
	{ id: '1', sender: 'user', content: 'Which days had late stops?' },
	{
		id: '2',
		sender: 'assistant',
		content: [{ kind: 'text', id: 't1', text, citations: [citation] }],
	},
]

const targets = { 'late-by-day': { label: 'Late stops by day' } }

export default function SelectsInAChart() {
	const [cited, setCited] = useState<ChatCitation | null>(null)

	return (
		<Stack gap="lg">
			<ChatCitationProvider targets={targets} cited={cited} onCite={setCited}>
				<ChatTranscript messages={messages} />
			</ChatCitationProvider>
			<BarChart
				aria-label="Late stops by day"
				data={DAYS}
				series={[{ xKey: 'day', yKey: 'late', yName: 'Late stops' }]}
				selectedCategories={
					cited?.target === 'late-by-day' ? toCategorySelection(cited.selector) : undefined
				}
			/>
		</Stack>
	)
}
