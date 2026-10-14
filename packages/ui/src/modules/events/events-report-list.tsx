'use client'

import { Copy, ListX, Trash2 } from 'lucide-react'
import { Button } from '../../components/button'
import { CopyButton } from '../../components/copy-button'
import { Icon } from '../../components/icon'
import { List, ListItem } from '../../components/list'
import { Text } from '../../components/text'
import { cn } from '../../core'
import { Flex } from '../../structure/flex'
import { markdownOf, titleOf } from './engine/events-report'
import type { EventEntry, EventReport } from './engine/types'

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
	const { report } = entry

	return (
		<ListItem
			onClick={onView}
			className="text-start"
			suffix={
				<Flex align="center" gap="sm">
					<Button variant="bare" size="sm" aria-label="View" onClick={onView}>
						<Icon icon={<ListX />} />
					</Button>
					<CopyButton size="sm" icon={<Copy />} text={markdownOf(entry)} />
					<Button variant="bare" size="sm" aria-label="Delete" onClick={onDelete}>
						<Icon icon={<Trash2 />} />
					</Button>
				</Flex>
			}
		>
			<span className="block min-w-0">
				<Text
					className={cn(
						'truncate font-mono text-xs',
						report.origin === 'capture'
							? 'text-blue-600 dark:text-blue-400'
							: 'text-red-600 dark:text-red-400',
					)}
				>
					{titleOf(entry)}
				</Text>
				<Text tone="muted" className="truncate text-xs">
					{report.page} · {new Date(report.at).toLocaleTimeString()} · {report.origin}
				</Text>
				<Text className="truncate font-mono text-xs text-rose-600 dark:text-rose-400">
					{report.hash}
				</Text>
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
	return (
		<List
			items={reports.toReversed()}
			getKey={getKey}
			variant="plain"
			sortable={false}
			aria-label="Bugs"
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
