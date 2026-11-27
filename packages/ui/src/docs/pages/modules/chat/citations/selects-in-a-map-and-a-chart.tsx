import { useCallback, useMemo, useState } from 'react'
import { BarChart } from 'ui/chart'
import {
	type ChatCitation,
	ChatCitationProvider,
	type ChatMessageData,
	ChatTranscript,
	toCategorySelection,
	toStopSelection,
} from 'ui/chat'
import { useMediaQuery } from 'ui/hooks'
import { MapPlat, MapPoints } from 'ui/map'
import { ResizableGroup, ResizableHandle, ResizablePanel } from 'ui/resizable'
import { Stack } from 'ui/stack'
import { dayNames as day } from '../../../../data/calendar.ts'
import { states } from '../../map/data.ts'
import { lateByDay, lateStops } from '../late-stops.ts'
import { Pane } from './pane.tsx'

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

const targets = {
	'late-stops': { label: 'Late stops' },
	'late-by-day': { label: 'Late stops by day' },
}

export default function SelectsInAMapAndAChart() {
	const [cited, setCited] = useState<ChatCitation | null>(null)

	// The day that the reader picked in the chart, which filters the map.
	const [picked, setPicked] = useState<string | null>(null)

	// A hover previews a citation over the cited one, and a click cites it. The
	// panes draw the preview, but each Clear control reads `cited` and `picked`
	// alone, so it shows only for a selection that a click keeps.
	const [previewed, setPreviewed] = useState<ChatCitation | null>(null)

	const active = previewed ?? cited

	// One selection shows at a time, so a preview hides the pick until it ends.
	// The pick stays, and it shows again when the preview ends.
	const filter = previewed === null ? picked : null

	// One selection applies at a time. A citation clears the pick of the reader,
	// and a pick clears the citation. Thus a pane never marks a citation while a
	// filter that it does not show applies.
	const cite = useCallback((citation: ChatCitation | null) => {
		setCited(citation)

		if (citation !== null) setPicked(null)
	}, [])

	const pick = useCallback((value: string) => {
		setCited(null)

		setPicked((prev) => (prev === value ? null : value))
	}, [])

	// The stops that the pick lets through. The map draws these stops, so the
	// index of a stop counts these stops.
	const shown = useMemo(
		() => (filter === null ? lateStops : lateStops.filter((stop) => stop.day === filter)),
		[filter],
	)

	const getIndex = useMemo(() => {
		const byKey = new Map(shown.map((stop, index) => [stop.key, index]))

		return (key: string) => byKey.get(key)
	}, [shown])

	// A pick in the chart marks each citation that selects the picked day.
	const isMarked = useCallback(
		(citation: ChatCitation) =>
			filter !== null &&
			citation.target === 'late-by-day' &&
			(toCategorySelection(citation.selector) ?? []).includes(filter),
		[filter],
	)

	const clearCited = useCallback(() => setCited(null), [])

	// The chart shows the citation or the pick, so its Clear control clears both.
	const clearChart = useCallback(() => {
		setCited(null)

		setPicked(null)
	}, [])

	const pickedDays = filter === null ? undefined : [filter]

	// At phone width, half of the column is too narrow for the map, so the panes
	// stack. A resizable group puts its panels side by side only.
	const wide = useMediaQuery('(width >= 40rem)')

	const map = (
		<Pane title="Late stops" onClear={cited?.target === 'late-stops' ? clearCited : undefined}>
			<MapPlat
				aria-label="Late stops"
				geography={states}
				projection="albers-usa"
				// The title of the pane names the one group of dots, as the title of
				// the chart names its one series. A legend would only take height
				// from the map.
				legend={false}
				selectedOverlays={
					active?.target === 'late-stops'
						? toStopSelection(active.selector, 'stops', getIndex)
						: undefined
				}
			>
				<MapPoints id="stops" label="Late stops" points={shown} />
			</MapPlat>
		</Pane>
	)

	const chart = (
		<Pane
			title="Late stops by day"
			onClear={cited?.target === 'late-by-day' || picked !== null ? clearChart : undefined}
		>
			<BarChart
				aria-label="Late stops by day"
				data={lateByDay}
				series={[{ xKey: 'day', yKey: 'late', yName: 'Late stops' }]}
				// A previewed or cited citation marks its bar. Without one, the bar
				// of the reader's own pick is marked.
				selectedCategories={
					active?.target === 'late-by-day' ? toCategorySelection(active.selector) : pickedDays
				}
				// A pick of the reader filters the map and clears the citation.
				onCategoryClick={pick}
			/>
		</Pane>
	)

	return (
		<Stack gap="lg">
			<ChatCitationProvider
				targets={targets}
				trigger={['hover', 'click']}
				cited={cited}
				onCitedChange={cite}
				onPreviewChange={setPreviewed}
				isMarked={isMarked}
			>
				<ChatTranscript messages={messages} />
			</ChatCitationProvider>
			{/* The handle between the panes resizes both at once. Each surface keeps its
			    aspect ratio, so it gets taller as its pane gets wider, and the taller
			    surface sets the height of the group. */}
			{wide ? (
				<ResizableGroup>
					<ResizablePanel defaultSize={50} minSize={30}>
						{map}
					</ResizablePanel>
					<ResizableHandle aria-label="Resize the map and the chart" />
					<ResizablePanel defaultSize={50} minSize={30}>
						{chart}
					</ResizablePanel>
				</ResizableGroup>
			) : (
				<Stack gap="lg">
					{map}
					{chart}
				</Stack>
			)}
		</Stack>
	)
}
