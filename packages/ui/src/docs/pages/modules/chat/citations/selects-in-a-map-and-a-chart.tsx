import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { Button } from 'ui/button'
import { Card, CardBody, CardHeader, CardTitle } from 'ui/card'
import { BarChart } from 'ui/chart'
import {
	type ChatCitation,
	ChatCitationProvider,
	type ChatMessageData,
	ChatTranscript,
	toCategorySelection,
	toStopSelection,
} from 'ui/chat'
import { Flex } from 'ui/flex'
import { MapPlat, MapPoints } from 'ui/map'
import { ResizableGroup, ResizableHandle, ResizablePanel } from 'ui/resizable'
import { Stack } from 'ui/stack'
import { dayNames as day } from '../../../../data/calendar.ts'
import { states } from '../../map/data.ts'
import { deliveryStops } from '../../map/point/data.ts'

// The day of each late stop: seven of the twelve are on Tuesday.
const lateDays = [
	day.mon,
	day.tue,
	day.tue,
	day.wed,
	day.tue,
	day.thu,
	day.tue,
	day.fri,
	day.tue,
	day.fri,
	day.tue,
	day.tue,
]

const week = [day.mon, day.tue, day.wed, day.thu, day.fri]

// The late stops of one week. A row has a key that does not change, so an
// agent can name the row. The day is the field that the chart filters.
const rows = deliveryStops
	.filter((stop) => stop.parcels !== undefined)
	.slice(0, 12)
	.map((stop, n) => ({
		...stop,
		key: `stop-${n + 1}`,
		day: lateDays[n] ?? day.tue,
	}))

const data = week.map((name) => ({
	day: name,
	late: rows.filter((row) => row.day === name).length,
}))

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
	cite('late', phrase.label, 'late-stops', { stops: rows.map((row) => row.key) }),
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

// A pane of the group: a card with a title, a Clear control while a selection
// applies, and a surface under them.
function Pane({
	title,
	onClear,
	children,
}: {
	title: string
	onClear?: () => void
	children: ReactNode
}) {
	return (
		<Card className="flex h-full flex-col">
			<CardHeader>
				<Flex align="center" justify="between" gap="sm">
					<CardTitle>{title}</CardTitle>
					{/* The control keeps its space while it hides, so both headers have one height. */}
					<Button variant="plain" onClick={onClear} className={onClear ? undefined : 'invisible'}>
						Clear
					</Button>
				</Flex>
			</CardHeader>
			<CardBody className="min-h-0 flex-1">{children}</CardBody>
		</Card>
	)
}

export default function SelectsInAMapAndAChart() {
	const [cited, setCited] = useState<ChatCitation | null>(null)

	// The day that the reader picked in the chart, which filters the map.
	const [picked, setPicked] = useState<string | null>(null)

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

	// The rows that the pick lets through. The map draws these rows, so the
	// index of a stop counts these rows.
	const shown = useMemo(
		() => (picked === null ? rows : rows.filter((row) => row.day === picked)),
		[picked],
	)

	const getIndex = useMemo(() => {
		const byKey = new Map(shown.map((row, index) => [row.key, index]))

		return (key: string) => byKey.get(key)
	}, [shown])

	// A pick in the chart marks each citation that selects the picked day.
	const isMarked = useCallback(
		(citation: ChatCitation) =>
			picked !== null &&
			citation.target === 'late-by-day' &&
			(toCategorySelection(citation.selector) ?? []).includes(picked),
		[picked],
	)

	const clearCited = useCallback(() => setCited(null), [])

	// The chart shows the citation or the pick, so its Clear control clears both.
	const clearChart = useCallback(() => {
		setCited(null)

		setPicked(null)
	}, [])

	const pickedDays = picked === null ? undefined : [picked]

	return (
		<Stack gap="lg">
			<ChatCitationProvider
				targets={targets}
				cited={cited}
				onCitedChange={cite}
				isMarked={isMarked}
			>
				<ChatTranscript messages={messages} />
			</ChatCitationProvider>
			{/* The handle between the panes resizes both at once. Each surface keeps its
			    aspect ratio, so it gets taller as its pane gets wider, and the taller
			    surface sets the height of the group. */}
			<ResizableGroup>
				<ResizablePanel defaultSize={50} minSize={25}>
					<Pane
						title="Late stops"
						onClear={cited?.target === 'late-stops' ? clearCited : undefined}
					>
						<MapPlat
							aria-label="Late stops"
							geography={states}
							projection="albers-usa"
							// The title of the pane names the one group of dots, as the title of
							// the chart names its one series. A legend would only take height
							// from the map.
							legend={false}
							selectedOverlays={
								cited?.target === 'late-stops'
									? toStopSelection(cited.selector, 'stops', getIndex)
									: undefined
							}
						>
							<MapPoints id="stops" label="Late stops" points={shown} />
						</MapPlat>
					</Pane>
				</ResizablePanel>
				<ResizableHandle aria-label="Resize the map and the chart" />
				<ResizablePanel defaultSize={50} minSize={25}>
					<Pane
						title="Late stops by day"
						onClear={cited?.target === 'late-by-day' || picked !== null ? clearChart : undefined}
					>
						<BarChart
							aria-label="Late stops by day"
							data={data}
							series={[{ xKey: 'day', yKey: 'late', yName: 'Late stops' }]}
							// An active citation marks its bar. Without one, the bar of the
							// reader's own pick is marked.
							selectedCategories={
								cited?.target === 'late-by-day' ? toCategorySelection(cited.selector) : pickedDays
							}
							// A pick of the reader filters the map and clears the citation.
							onCategoryClick={pick}
						/>
					</Pane>
				</ResizablePanel>
			</ResizableGroup>
		</Stack>
	)
}
