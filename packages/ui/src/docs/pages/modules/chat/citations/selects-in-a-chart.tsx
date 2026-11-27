import { useCallback, useState } from 'react'
import { BarChart } from 'ui/chart'
import {
	type ChatCitation,
	ChatCitationProvider,
	type ChatMessageData,
	ChatTranscript,
	toCategorySelection,
} from 'ui/chat'
import { ResizableGroup, ResizableHandle, ResizablePanel } from 'ui/resizable'
import { Stack } from 'ui/stack'
import { dayNames as day } from '../../../../data/calendar.ts'
import { lateByDay } from '../late-stops.ts'
import { Pane } from './pane.tsx'

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

	// A hover previews a citation over the cited one, and a click cites it.
	const [previewed, setPreviewed] = useState<ChatCitation | null>(null)

	const shown = previewed ?? cited

	const clear = useCallback(() => setCited(null), [])

	return (
		<Stack gap="lg">
			<ChatCitationProvider
				targets={targets}
				trigger={['hover', 'click']}
				cited={cited}
				onCitedChange={setCited}
				onPreviewChange={setPreviewed}
			>
				<ChatTranscript messages={messages} />
			</ChatCitationProvider>
			{/* The chart starts at half of the column, so it is not too tall. The
			    handle at its end edge sets the width, from 30% to the full column,
			    and a double-click on the handle gives the half again. At phone
			    width, half of the column is too narrow to read, so the handle and
			    the empty panel show from the `sm` breakpoint up. Below it, the chart
			    takes the full width. */}
			<ResizableGroup>
				<ResizablePanel defaultSize={50} minSize={30}>
					{/* The Clear control reads `cited` alone, so a preview does not show it. */}
					<Pane title="Late stops by day" onClear={cited === null ? undefined : clear}>
						<BarChart
							aria-label="Late stops by day"
							data={lateByDay}
							series={[{ xKey: 'day', yKey: 'late', yName: 'Late stops' }]}
							selectedCategories={
								shown?.target === 'late-by-day' ? toCategorySelection(shown.selector) : undefined
							}
						/>
					</Pane>
				</ResizablePanel>
				<ResizableHandle aria-label="Resize the chart" className="hidden sm:flex" />
				<ResizablePanel defaultSize={50} className="hidden sm:block" />
			</ResizableGroup>
		</Stack>
	)
}
