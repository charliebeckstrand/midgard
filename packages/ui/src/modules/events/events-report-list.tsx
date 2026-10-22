'use client'

import { Copy, ListX, Trash2 } from 'lucide-react'
import { Button } from '../../components/button'
import { CopyButton } from '../../components/copy-button'
import { Icon } from '../../components/icon'
import { List, ListItem } from '../../components/list'
import { Text } from '../../components/text'
import { cn } from '../../core'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/events'
import { Flex } from '../../structure/flex'
import { formatMarkdown, formatTitle } from './engine/events-report'
import type { EventEntry, EventReport } from './engine/types'
import { eventsMessages } from './events-messages'

/** The slots of the events. */
const slots = k()

/** An event with a report. */
export type ReportEntry = EventEntry & { report: EventReport }

function getKey(entry: ReportEntry): string {
	return String(entry.id)
}

/**
 * One report in the list: the title, the page and the time, and the hash,
 * then View, Copy, and Delete. A press on the row outside the actions opens
 * the report, as View does.
 */
function ReportLine({
	entry,
	onView,
	onDelete,
}: {
	entry: ReportEntry
	onView: () => void
	onDelete: () => void
}) {
	const intl = useIntl()

	const { report } = entry

	return (
		<ListItem
			onClick={onView}
			className="text-start"
			suffix={
				<Flex align="center" gap="sm">
					<Button
						variant="bare"
						size="sm"
						aria-label={intl.formatMessage(eventsMessages.viewReport)}
						onClick={onView}
					>
						<Icon icon={<ListX />} />
					</Button>
					<CopyButton size="sm" icon={<Copy />} text={() => formatMarkdown(entry)} />
					<Button
						variant="bare"
						size="sm"
						aria-label={intl.formatMessage(eventsMessages.delete)}
						onClick={onDelete}
					>
						<Icon icon={<Trash2 />} />
					</Button>
				</Flex>
			}
		>
			<span className="block min-w-0">
				<Text
					className={cn(
						'truncate font-mono text-xs',
						report.origin === 'capture' ? k.kind.capture : k.kind.error,
					)}
				>
					{formatTitle(entry)}
				</Text>
				<Text tone="muted" className="truncate text-xs">
					{report.page} · {intl.formatTime(new Date(report.at), { timeStyle: 'medium' })} ·{' '}
					{report.origin}
				</Text>
				<Text className={cn('truncate font-mono text-xs', slots.hash)}>{report.hash}</Text>
			</span>
		</ListItem>
	)
}

/**
 * The list of the reports of the bugs and the captures, newest first.
 *
 * @internal
 */
export function EventsReportList({
	reports,
	onView,
	onDelete,
}: {
	reports: readonly ReportEntry[]
	onView: (id: number) => void
	onDelete: (id: number) => void
}) {
	const intl = useIntl()

	return (
		<List
			items={reports.toReversed()}
			getKey={getKey}
			variant="plain"
			sortable={false}
			aria-label={intl.formatMessage(eventsMessages.bugs)}
		>
			{(entry) => (
				<ReportLine
					entry={entry}
					onView={() => onView(entry.id)}
					onDelete={() => onDelete(entry.id)}
				/>
			)}
		</List>
	)
}
