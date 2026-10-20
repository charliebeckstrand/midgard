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
import { intlMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { formatMarkdown } from './engine/events-report'
import type { EventStore } from './engine/events-store'
import { formatRow, getKindWidth, groupRows } from './engine/events-text'
import { EventsCopyButton } from './events-copy-button'
import { EventsFlagField } from './events-flag-field'
import { EventsList, type EventsOpenState } from './events-list'
import { bugsCountMessage, eventsMessages } from './events-messages'
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
 * @param live - Whether the view renders for each new event, such as the open state of a sheet.
 * @internal
 */
export function useEventsView(live: boolean): EventsViewParts {
	const { store, entries, preserve, batched, capturing } = useEvents(live)

	const intl = useIntl()

	const [tab, setTab] = useState<Tab>('events')

	// The id of the report on view. A report that goes out returns the view to the list.
	const [viewed, setViewed] = useState<number>()

	// A sheet that opens or closes returns the view to the list.
	const [prevLive, setPrevLive] = useState(live)

	if (live !== prevLive) {
		setPrevLive(live)

		setViewed(undefined)
	}

	// The keys of the open lines. The list renders only the rows in view, so the
	// view keeps the open state of a row out of view.
	const [openKeys, setOpenKeys] = useState<ReadonlySet<string>>(() => new Set())

	const openState: EventsOpenState = {
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

	const viewReport = (id: number) => {
		setTab('bugs')

		setViewed(id)
	}

	const captureButton = (
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

				if (id !== undefined) viewReport(id)
			}}
		>
			{intl.formatMessage(capturing ? eventsMessages.stopCapture : eventsMessages.capture)}
		</Button>
	)

	const clearButton = entries.length > 0 && (
		<Button size="sm" color="amber" onClick={() => store.clear()}>
			{intl.formatMessage(intlMessages.clear)}
		</Button>
	)

	const preserveField = (
		<EventsFlagField
			label={intl.formatMessage(eventsMessages.preserve)}
			checked={preserve}
			// A capture keeps its events through a reload, so "Preserve" is on while it runs.
			disabled={capturing}
			onChange={(checked) => {
				store.setPreserve(checked)
			}}
		/>
	)

	if (report) {
		const markdown = formatMarkdown(report)

		return {
			store,
			label: intl.formatMessage(eventsMessages.bugs),
			// The crumbs name the report and lead back to the list.
			title: (
				<Breadcrumb
					className="me-auto min-w-0"
					aria-label={intl.formatMessage(eventsMessages.trail)}
				>
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
								{intl.formatMessage(eventsMessages.bugs)}
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
			body: <Markdown headingOffset={1}>{markdown}</Markdown>,
			footer: (
				<>
					<EventsCopyButton text={() => markdown} />
					<Button
						size="sm"
						color="red"
						onClick={() => {
							setViewed(undefined)

							store.removeReport(report.id)
						}}
					>
						{intl.formatMessage(eventsMessages.delete)}
					</Button>
				</>
			),
		}
	}

	const tabs = (
		<Segment
			className="me-auto"
			value={tab}
			onValueChange={(value) => setTab(value === 'bugs' ? 'bugs' : 'events')}
		>
			<SegmentControl aria-label={intl.formatMessage(eventsMessages.view)}>
				<SegmentItem value="events">{intl.formatMessage(eventsMessages.events)}</SegmentItem>
				<SegmentItem value="bugs">
					{reports.length > 0
						? intl.formatMessage(bugsCountMessage, { count: reports.length })
						: intl.formatMessage(eventsMessages.bugs)}
				</SegmentItem>
			</SegmentControl>
		</Segment>
	)

	if (tab === 'bugs')
		return {
			store,
			label: intl.formatMessage(eventsMessages.bugs),
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
					<Text tone="muted">{intl.formatMessage(eventsMessages.noBugs)}</Text>
				),
			footer: (
				<>
					{captureButton}
					{clearButton}
				</>
			),
		}

	const rows = groupRows(entries, batched)

	const width = getKindWidth(entries)

	return {
		store,
		label: intl.formatMessage(eventsMessages.events),
		title: tabs,
		actions: (
			<>
				{preserveField}
				<EventsFlagField
					label={intl.formatMessage(eventsMessages.batch)}
					checked={batched}
					onChange={(checked) => {
						store.setBatched(checked)
					}}
				/>
			</>
		),
		body:
			entries.length > 0 ? (
				<EventsList rows={rows} width={width} openState={openState} onReport={viewReport} />
			) : (
				<Text tone="muted">{intl.formatMessage(eventsMessages.noEvents)}</Text>
			),
		footer: (
			<>
				<EventsCopyButton text={() => rows.map((row) => formatRow(row, width)).join('\n')} />
				{captureButton}
				{clearButton}
			</>
		),
	}
}
