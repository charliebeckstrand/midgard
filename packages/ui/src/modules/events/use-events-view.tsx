'use client'

import { Play, Square } from 'lucide-react'
import { type MouseEvent, type ReactNode, useState } from 'react'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from '../../components/breadcrumb'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { Markdown } from '../../components/markdown'
import { Segment, SegmentControl, SegmentItem } from '../../components/segment'
import { Text } from '../../components/text'
import { markdownOf } from './engine/events-report'
import type { EventStore } from './engine/events-store'
import { kindWidth, rowsOf, rowText } from './engine/events-text'
import { EventsCopyButton } from './events-copy-button'
import { EventsFlagField } from './events-flag-field'
import { EventsList, type EventsOpenState } from './events-list'
import { EventsReportList, type ReportEntry } from './events-report-list'
import { useEvents } from './use-events'

/** The tab of the view. */
type Tab = 'events' | 'bugs'

/** The parts of the view, which the sheet and the pinned panel place in their own frames. */
export type EventsViewParts = {
	/** The store of the tab. */
	store: EventStore
	/** The name of the view. The frame gives it to its title, which the screen reader reads. */
	label: string
	/** The start of the title row: the tabs, or the crumbs of the report on view. */
	title: ReactNode
	/** The controls at the end of the title row. */
	actions: ReactNode
	/** The list, or the report on view. */
	body: ReactNode
	/** The buttons at the start of the footer. */
	footer: ReactNode
}

/**
 * The state and the parts of the view of the events: the Events and the Bugs
 * tabs, the report on view, and their controls. The Events tab shows each
 * event, newest first, with "Preserve" and "Batch", then Copy, Capture, and
 * Clear. The Bugs tab shows the events with a report: the bugs and the
 * captures. A report shows in place of the list, with its crumbs, and Copy
 * and Delete of that report. Capture is a switch: "Stop capture" ends the
 * capture and shows its report.
 *
 * @param live - Whether the view renders for each new event.
 * @param reset - A value whose change returns the view to the list, such as the open state of a sheet.
 * @internal
 */
export function useEventsView({
	live,
	reset,
}: {
	live: boolean
	reset?: unknown
}): EventsViewParts {
	const { store, entries, preserve, batched, capturing } = useEvents(live)

	const [tab, setTab] = useState<Tab>('events')

	// The id of the report on view. A report that goes out returns the view to the list.
	const [viewed, setViewed] = useState<number>()

	const [prevReset, setPrevReset] = useState(reset)

	if (reset !== prevReset) {
		setPrevReset(reset)

		setViewed(undefined)
	}

	// The keys of the open lines. The list renders only the rows in view, so the
	// view keeps the open state of a row out of view.
	const [openKeys, setOpenKeys] = useState<ReadonlySet<string>>(() => new Set())

	const state: EventsOpenState = {
		isOpen: (key) => openKeys.has(key),
		setOpen: (key, next) =>
			setOpenKeys((prev) => {
				const keys = new Set(prev)

				if (next) keys.add(key)
				else keys.delete(key)

				return keys
			}),
	}

	const reports = entries.filter((entry): entry is ReportEntry => entry.report !== undefined)

	const report = reports.find(({ id }) => id === viewed)

	const view = (id: number) => {
		setTab('bugs')

		setViewed(id)
	}

	const capture = (
		<Button
			size="sm"
			color={capturing ? 'red' : 'blue'}
			prefix={
				<Icon icon={capturing ? <Square fill="currentColor" /> : <Play fill="currentColor" />} />
			}
			onClick={() => {
				if (!capturing) {
					store.startCapture()

					return
				}

				const id = store.stopCapture()

				if (id !== undefined) view(id)
			}}
		>
			{capturing ? 'Stop capture' : 'Capture'}
		</Button>
	)

	const clear = entries.length > 0 && (
		<Button size="sm" color="amber" onClick={() => store.clear()}>
			Clear
		</Button>
	)

	const preserveField = (
		<EventsFlagField
			label="Preserve"
			checked={preserve}
			// A capture keeps its events through a reload, so "Preserve" is on while it runs.
			disabled={capturing}
			onChange={(checked) => {
				store.setPreserve(checked)
			}}
		/>
	)

	if (report)
		return {
			store,
			label: 'Bugs',
			// The crumbs name the report and lead back to the list.
			title: (
				<Breadcrumb className="me-auto min-w-0">
					<BreadcrumbList className="text-xl/8">
						<BreadcrumbItem>
							<BreadcrumbLink
								href="#"
								className="font-semibold"
								onClick={(event: MouseEvent) => {
									event.preventDefault()

									setViewed(undefined)
								}}
							>
								Bugs
							</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbLink current className="font-semibold">
								{report.report.hash}
							</BreadcrumbLink>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			),
			actions: null,
			body: <Markdown headingOffset={1}>{markdownOf(report)}</Markdown>,
			footer: (
				<>
					<EventsCopyButton text={markdownOf(report)} />
					<Button
						size="sm"
						color="red"
						onClick={() => {
							setViewed(undefined)

							store.removeReport(report.id)
						}}
					>
						Delete
					</Button>
				</>
			),
		}

	const tabs = (
		<Segment
			className="me-auto"
			value={tab}
			onValueChange={(value) => setTab(value === 'bugs' ? 'bugs' : 'events')}
		>
			<SegmentControl aria-label="View">
				<SegmentItem value="events">Events</SegmentItem>
				<SegmentItem value="bugs">
					{reports.length > 0 ? `Bugs ${reports.length}` : 'Bugs'}
				</SegmentItem>
			</SegmentControl>
		</Segment>
	)

	if (tab === 'bugs')
		return {
			store,
			label: 'Bugs',
			title: tabs,
			actions: preserveField,
			body:
				reports.length > 0 ? (
					<EventsReportList
						reports={reports}
						onView={setViewed}
						onDelete={(id) => store.removeReport(id)}
					/>
				) : (
					<Text tone="muted">No bugs</Text>
				),
			footer: (
				<>
					{capture}
					{clear}
				</>
			),
		}

	const rows = rowsOf(entries, batched)

	const width = kindWidth(entries)

	return {
		store,
		label: 'Events',
		title: tabs,
		actions: (
			<>
				{preserveField}
				<EventsFlagField
					label="Batch"
					checked={batched}
					onChange={(checked) => {
						store.setBatched(checked)
					}}
				/>
			</>
		),
		body:
			entries.length > 0 ? (
				<EventsList rows={rows} width={width} state={state} onReport={view} />
			) : (
				<Text tone="muted">No events</Text>
			),
		footer: (
			<>
				<EventsCopyButton text={rows.map((row) => rowText(row, width)).join('\n')} />
				{capture}
				{clear}
			</>
		),
	}
}
