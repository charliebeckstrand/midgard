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
import { createContext } from 'ui/core'
import {
	Dashboard,
	type DashboardLayoutItem,
	type DashboardSelection,
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

// The two tiles take half of the board each and one ratio, so they are the same height.
const layout: DashboardLayoutItem[] = [
	{ id: 'map', x: 0, y: 0, w: 12 },
	{ id: 'days', x: 12, y: 0, w: 12 },
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
			// A pick of the reader filters the board and clears the citation.
			onCategoryClick={(value) => {
				setCited(null)

				scope.select('day', value)
			}}
		/>
	)
}

// The Clear control of a tile that shows the active citation. A press clears
// the citation, as it clears a pick of the reader.
function useClearCited(target: string): (() => void) | undefined {
	const { cited, setCited } = useCited()

	const clear = useCallback(() => setCited(null), [setCited])

	return cited?.target === target ? clear : undefined
}

// On a narrow board, the map tile takes the height of its content. The map keeps
// its own ratio at the full width of the tile, so a fixed ratio would put the map
// in a scroll region.
function MapTile() {
	return (
		<DashboardTile
			id="map"
			title="Late stops"
			ratio={16 / 10}
			fitContent
			onClear={useClearCited('late-stops')}
		>
			<LateStops />
		</DashboardTile>
	)
}

function DaysTile() {
	return (
		<DashboardTile
			id="days"
			title="Late stops by day"
			ratio={16 / 10}
			onClear={useClearCited('late-by-day')}
		>
			<LateByDay />
		</DashboardTile>
	)
}

// The tiles take no state of the example, so each render gives the same elements.
const tiles = (
	<>
		<MapTile />
		<DaysTile />
	</>
)

export default function SelectsInADashboard() {
	const [cited, setCited] = useState<ChatCitation | null>(null)

	const [selection, setSelection] = useState<DashboardSelection[]>([])

	const value = useMemo(() => ({ cited, setCited }), [cited])

	// The board shows one selection at a time. A citation clears the selections
	// of the tiles, and a pick in a tile clears the citation. Thus a tile never
	// marks a citation while a filter that it does not show applies.
	const cite = useCallback((citation: ChatCitation | null) => {
		setCited(citation)

		if (citation !== null) setSelection([])
	}, [])

	// The days that a reader picked in the chart.
	const pickedDays = useMemo(
		() => selection.filter((item) => item.field === 'day').flatMap((item) => item.values),
		[selection],
	)

	// A pick in the chart marks each citation that selects one of the picked days.
	const isMarked = useCallback(
		(citation: ChatCitation) =>
			citation.target === 'late-by-day' &&
			(toCategorySelection(citation.selector) ?? []).some((name) => pickedDays.includes(name)),
		[pickedDays],
	)

	return (
		<Stack gap="lg">
			<ChatCitationProvider targets={targets} cited={cited} onCite={cite} isMarked={isMarked}>
				<ChatTranscript messages={messages} />
			</ChatCitationProvider>
			<Cited value={value}>
				<Dashboard
					aria-label="Late stops this week"
					layout={{ defaultValue: layout }}
					selection={{ value: selection, onValueChange: setSelection }}
				>
					{tiles}
				</Dashboard>
			</Cited>
		</Stack>
	)
}
