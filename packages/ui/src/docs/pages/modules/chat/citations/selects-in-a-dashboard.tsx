import { useMemo, useState } from 'react'
import { BarChart } from 'ui/chart'
import {
	type ChatCitation,
	ChatCitationProvider,
	type ChatMessageData,
	ChatTranscript,
	toCategorySelection,
	toStopSelection,
} from 'ui/chat'
import { createContext } from 'ui/core'
import {
	Dashboard,
	type DashboardLayoutItem,
	DashboardTile,
	useDashboardRows,
	useDashboardScope,
} from 'ui/dashboard'
import { MapPlat, MapPoints } from 'ui/map'
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

const layout: DashboardLayoutItem[] = [
	{ id: 'map', x: 0, y: 0, w: 14 },
	{ id: 'days', x: 14, y: 0, w: 10 },
]

// The active citation belongs to the app. The tiles read it from a context of
// the app, because the board and the transcript are siblings.
type CitedValue = {
	cited: ChatCitation | null
	setCited: (citation: ChatCitation | null) => void
}

const [Cited, useCited] = createContext<CitedValue>('Cited')

function LateStops() {
	const { cited } = useCited()

	// The rows that the selection of the chart lets through. The map draws
	// these rows, so the index of a stop counts these rows.
	const shown = useDashboardRows(rows)

	const getIndex = useMemo(() => {
		const byKey = new Map(shown.map((row, index) => [row.key, index]))

		return (key: string) => byKey.get(key)
	}, [shown])

	return (
		<MapPlat
			aria-label="Late stops"
			geography={states}
			projection="albers-usa"
			selectedOverlays={
				cited?.target === 'late-stops'
					? toStopSelection(cited.selector, 'stops', getIndex)
					: undefined
			}
		>
			<MapPoints id="stops" label="Late stops" points={shown} />
		</MapPlat>
	)
}

function LateByDay() {
	const { cited, setCited } = useCited()

	const scope = useDashboardScope()

	const data = useMemo(
		() => week.map((name) => ({ day: name, late: rows.filter((row) => row.day === name).length })),
		[],
	)

	return (
		<BarChart
			aria-label="Late stops by day"
			data={data}
			series={[{ xKey: 'day', yKey: 'late', yName: 'Late stops' }]}
			aspectRatio={false}
			// An active citation marks its bar. Without one, the bar of the reader's
			// own selection is marked.
			selectedCategories={
				cited?.target === 'late-by-day'
					? toCategorySelection(cited.selector)
					: scope.selected('day')
			}
			// A pick of the reader filters the board and clears the citation, so the
			// chart never marks a bar that the filter does not hold.
			onCategoryClick={(value) => {
				setCited(null)

				scope.select('day', value)
			}}
		/>
	)
}

// The tiles take no state of the example, so each render gives the same elements.
const tiles = (
	<>
		<DashboardTile id="map" title="Late stops" ratio={16 / 10}>
			<LateStops />
		</DashboardTile>
		<DashboardTile id="days" title="Late stops by day" ratio={4 / 3}>
			<LateByDay />
		</DashboardTile>
	</>
)

export default function SelectsInADashboard() {
	const [cited, setCited] = useState<ChatCitation | null>(null)

	const value = useMemo(() => ({ cited, setCited }), [cited])

	return (
		<Stack gap="lg">
			<ChatCitationProvider targets={targets} cited={cited} onCite={setCited}>
				<ChatTranscript messages={messages} />
			</ChatCitationProvider>
			<Cited value={value}>
				<Dashboard aria-label="Late stops this week" layout={{ defaultValue: layout }}>
					{tiles}
				</Dashboard>
			</Cited>
		</Stack>
	)
}
