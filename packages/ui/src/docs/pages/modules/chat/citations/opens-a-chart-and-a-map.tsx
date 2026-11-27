import { BarChart } from 'ui/chart'
import {
	type ChatCitation,
	ChatCitationProvider,
	type ChatCitationTargets,
	type ChatMessageData,
	ChatTranscript,
	toCategorySelection,
} from 'ui/chat'
import { MapPlat, MapPoints } from 'ui/map'
import { dayNames as day } from '../../../../data/calendar.ts'
import { states } from '../../map/data.ts'
import { lateByDay, lateStops } from '../late-stops.ts'

// Each phrase that a citation covers is a text of its own, so a translation
// keeps the phrase whole, and the offsets come from the translated reply.
const phrase = { label: 'Twelve stops are late', detail: 'most of them on Tuesday' }

const reply = { text: `${phrase.label} this week, and ${phrase.detail}.` }

const TEXT = reply.text

// The producer of a reply knows where each phrase is in its own text, so it
// gives the offsets and the quote.
function cite(id: string, quote: string, target: string, selector: unknown): ChatCitation {
	const start = TEXT.indexOf(quote)

	return { id, start, end: start + quote.length, quote, target, selector }
}

const citations = [
	cite('late', phrase.label, 'late-stops', { stops: lateStops.map((stop) => stop.key) }),
	cite('tuesday', phrase.detail, 'late-by-day', { categories: [day.tue] }),
]

const messages: ChatMessageData[] = [
	{ id: '1', sender: 'user', content: 'Which stops were late this week?' },
	{ id: '2', sender: 'assistant', content: [{ kind: 'text', id: 't1', text: TEXT, citations }] },
]

/** The keys of the stops that a citation names. */
function stopKeys(selector: unknown): ReadonlySet<unknown> {
	const { stops } = selector as { stops: string[] }

	return new Set(stops)
}

// Each target draws its view in a panel. The map draws the stops that the
// citation names, and the chart marks the day that it names.
const targets = {
	'late-stops': {
		label: 'Late stops',
		render: (citation) => (
			<MapPlat
				aria-label="Late stops"
				geography={states}
				projection="albers-usa"
				// The title of the panel names the one group of dots.
				legend={false}
			>
				<MapPoints
					id="stops"
					label="Late stops"
					points={lateStops.filter((stop) => stopKeys(citation.selector).has(stop.key))}
				/>
			</MapPlat>
		),
	},
	'late-by-day': {
		label: 'Late stops by day',
		render: (citation) => (
			<BarChart
				aria-label="Late stops by day"
				data={lateByDay}
				series={[{ xKey: 'day', yKey: 'late', yName: 'Late stops' }]}
				selectedCategories={toCategorySelection(citation.selector)}
			/>
		),
	},
} satisfies ChatCitationTargets

export default function OpensAChartAndAMap() {
	return (
		<ChatCitationProvider targets={targets}>
			<ChatTranscript messages={messages} />
		</ChatCitationProvider>
	)
}
