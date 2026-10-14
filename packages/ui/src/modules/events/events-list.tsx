'use client'

import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Collapse, CollapsePanel, CollapseTrigger } from '../../components/collapse'
import { Icon } from '../../components/icon'
import { JsonTree } from '../../components/json-tree'
import { List, ListItem } from '../../components/list'
import { cn } from '../../core'
import { k } from '../../recipes/kata/events'
import { Flex } from '../../structure/flex'
import { getOrCompute } from '../../utilities/get-or-compute'
import { columns, type EventRow, summaryOf } from './engine/events-text'
import type { EventEntry } from './engine/types'

// The key of each line. An event is an object that the store keeps until it
// drops the event, so the key of a line stays while the line stays.
const keys = new WeakMap<EventEntry, number>()

let lastKey = 0

function keyOf(entry: EventEntry): number {
	return getOrCompute(keys, entry, () => ++lastKey)
}

/**
 * The key of a row in the list, and of its open state: the key of its event,
 * or the batch of a row of more than one event.
 */
function getKey(row: EventRow): string {
	return row.length === 1 ? `entry ${keyOf(row[0])}` : `batch ${row[0].batch}`
}

/** The open state of the lines, by the key of each line. */
export type EventsOpenState = {
	isOpen: (key: string) => boolean
	setOpen: (key: string, open: boolean) => void
}

/**
 * One line of the list: the columns of an event, the toggle of the panel, and
 * the text. The toggle holds the text, so a click on the text opens the panel
 * under the line. A line with no panel has no toggle. A line with a report
 * shows the chevron, and a press on its row opens the report.
 */
function EventLine({
	entry,
	text,
	panel,
	width,
	open,
	onOpenChange,
}: {
	/** The event whose columns and color the line shows. */
	entry: EventEntry
	text: string
	/** What the line opens: the detail of an event, or the lines of a batch. */
	panel: ReactNode
	/** The width of the kind column. */
	width: number
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	const color = Object.hasOwn(k.kind, entry.kind)
		? k.kind[entry.kind as keyof typeof k.kind]
		: undefined

	// Each line keeps the slot of the chevron, so the texts start in one column.
	// The slot is one line high, so the chevron sits on the first line. A long
	// text wraps in its own column, under the start of the text.
	const slot = (
		<span className="flex size-4 shrink-0 items-center">
			{(panel !== undefined || entry.report) && <Icon icon={<ChevronRight />} size={12} />}
		</span>
	)

	const head = (
		<span className={cn('flex font-mono text-xs', color)}>
			<span className="shrink-0 whitespace-pre">{columns(entry, width)}</span>
			{panel === undefined ? (
				// The gap is the gap of the toggle, so the texts of the two kinds of line
				// start in one column.
				<Flex as="span" align="start" gap="sm" className="min-w-0">
					{slot}
					<span className="min-w-0 wrap-break-word">{text}</span>
				</Flex>
			) : (
				// The trigger gives its muted color to the chevron. The text keeps the
				// color of the line.
				<CollapseTrigger className="min-w-0 items-start text-start text-xs aria-expanded:*:first:rotate-90">
					{slot}
					<span className={cn('min-w-0 wrap-break-word', color ?? k.text)}>{text}</span>
				</CollapseTrigger>
			)}
		</span>
	)

	if (panel === undefined) return head

	return (
		<Collapse open={open} onOpenChange={onOpenChange}>
			{head}
			<CollapsePanel>{panel}</CollapsePanel>
		</Collapse>
	)
}

type LineProps = {
	width: number
	state: EventsOpenState
	onReport: (id: number) => void
}

/** The line of one event. Its detail opens in a tree. */
function EntryLine({ entry, width, state }: Omit<LineProps, 'onReport'> & { entry: EventEntry }) {
	const key = getKey([entry])

	return (
		<EventLine
			entry={entry}
			text={entry.text}
			panel={
				entry.detail === undefined || entry.report ? undefined : (
					<JsonTree data={entry.detail} collapsible={false} aria-label="Details" />
				)
			}
			width={width}
			open={state.isOpen(key)}
			onOpenChange={(next) => state.setOpen(key, next)}
		/>
	)
}

/** One row of the list: the line of one event, or the summary of a batch, which opens to the lines of its events. */
function EventRowLine({ row, ...props }: Omit<LineProps, 'onReport'> & { row: EventRow }) {
	if (row.length === 1) return <EntryLine entry={row[0]} {...props} />

	const key = getKey(row)

	return (
		<EventLine
			entry={row[0]}
			text={summaryOf(row)}
			panel={row.map((entry) => <EntryLine key={keyOf(entry)} entry={entry} {...props} />)}
			width={props.width}
			open={props.state.isOpen(key)}
			onOpenChange={(next) => props.state.setOpen(key, next)}
		/>
	)
}

/**
 * The list of the events, newest first. A row of a batch opens to the lines
 * of its events, and a line with a report opens the report.
 *
 * @internal
 */
export function EventsList({
	rows,
	onReport,
	...props
}: LineProps & { rows: readonly EventRow[] }) {
	// The list renders the lines in the view of the body, so a long list opens
	// as fast as a short one.
	return (
		<List
			items={rows.toReversed()}
			getKey={getKey}
			variant="plain"
			sortable={false}
			virtual
			aria-label="Events"
		>
			{(row) => {
				const { report, id } = row[0]

				return (
					<ListItem onClick={report && row.length === 1 ? () => onReport(id) : undefined}>
						<EventRowLine row={row} {...props} />
					</ListItem>
				)
			}}
		</List>
	)
}
