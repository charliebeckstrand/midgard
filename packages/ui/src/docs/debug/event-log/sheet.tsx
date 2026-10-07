import { ChevronRight } from 'lucide-react'
import { type ReactNode, useState, useSyncExternalStore } from 'react'
import { Button } from 'ui/button'
import { Checkbox, CheckboxField } from 'ui/checkbox'
import { Collapse, CollapsePanel, CollapseTrigger } from 'ui/collapse'
import { useCopyButtonState } from 'ui/copy-button'
import { cn } from 'ui/core'
import { Label } from 'ui/fieldset'
import { Flex } from 'ui/flex'
import { Icon } from 'ui/icon'
import { JsonTree } from 'ui/json-tree'
import { List, ListItem } from 'ui/list'
import { Sheet, SheetBody, SheetClose, SheetFooter, SheetPanel, SheetTitle } from 'ui/sheet'
import { Text } from 'ui/text'
import { dan } from '../../../recipes/kiso/dan/index.ts'
import { iro } from '../../../recipes/kiso/iro/index.ts'
import { getOrCompute } from '../../../utilities/get-or-compute.ts'
import { noopSubscribe } from '../../../utilities/noop.ts'
import { useDebug } from '../pause.ts'
import type { Entry, Kind } from './log.ts'
import { type Row, rowsOf, summaryOf } from './rows.ts'
import { columns, kindWidth, lineOf } from './text.ts'

/**
 * One entry as text: the columns, then the text. A detail follows as indented
 * JSON, each line under the start of the text.
 */
function line(entry: Entry, width: number): string {
	const text = lineOf(entry, width)

	if (entry.detail === undefined) return text

	const indent = ' '.repeat(columns(entry, width).length)

	const detail = JSON.stringify(entry.detail, null, 2).replaceAll('\n', `\n${indent}`)

	return `${text}\n${indent}${detail}`
}

/**
 * One row as text. A row of a batch is the columns of its first entry and the
 * summary, then each entry, indented by two spaces.
 */
function rowText(row: Row, width: number): string {
	if (row.length === 1) return line(row[0], width)

	const entries = row.map((entry) => `  ${line(entry, width).replaceAll('\n', '\n  ')}`)

	return [columns(row[0], width) + summaryOf(row), ...entries].join('\n')
}

// The key of each line. An entry is an object that the log keeps until it
// drops the entry, so the key of a line stays while the line stays.
const keys = new WeakMap<Entry, number>()

let lastKey = 0

function keyOf(entry: Entry): number {
	return getOrCompute(keys, entry, () => ++lastKey)
}

/**
 * The key of a row in the list, and of its open state: the key of its entry,
 * or the batch of a row of more than one entry.
 */
function getKey(row: Row): string {
	return row.length === 1 ? `entry ${keyOf(row[0])}` : `batch ${row[0].batch}`
}

/** The color of the kinds that stand apart from the DOM events: the callbacks of the components and of the modules, and the errors. */
const COLOR: Partial<Record<Kind, string>> = {
	component: 'text-sky-600 dark:text-sky-400',
	module: 'text-violet-600 dark:text-violet-400',
	error: 'text-red-600 dark:text-red-400',
}

/**
 * One line of the sheet: the columns of an entry, the toggle of the panel, and
 * the text. The toggle holds the text, so a click on the text opens the panel
 * under the line. A line with no panel has no toggle.
 */
function EventLine({
	entry,
	text,
	panel,
	width,
	open,
	onOpenChange,
}: {
	/** The entry whose columns and color the line shows. */
	entry: Entry
	text: string
	/** What the line opens: the detail of an entry, or the lines of a batch. */
	panel: ReactNode
	/** The width of the kind column. */
	width: number
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	const color = COLOR[entry.kind]

	// Each line keeps the slot of the chevron, so the texts start in one column.
	// The slot is one line high, so the chevron sits on the first line. A long
	// text wraps in its own column, under the start of the text.
	const slot = (
		<span className="flex size-4 shrink-0 items-center">
			{panel !== undefined && <Icon icon={<ChevronRight />} size={12} />}
		</span>
	)

	const head = (
		<span className={cn('flex font-mono text-xs', color)}>
			<span className="shrink-0 whitespace-pre">{columns(entry, width)}</span>
			{panel === undefined ? (
				<>
					{slot}
					<span className="min-w-0 wrap-break-word">{text}</span>
				</>
			) : (
				// The trigger gives its muted color to the chevron. The text keeps the
				// color of the line.
				<CollapseTrigger className="min-w-0 items-start gap-0 text-start text-xs aria-expanded:*:first:rotate-90">
					{slot}
					<span className={cn('min-w-0 wrap-break-word', color ?? iro.text.default)}>{text}</span>
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

/** The open state of the lines, by the key of each line. */
type OpenState = {
	isOpen: (key: string) => boolean
	setOpen: (key: string, open: boolean) => void
}

/** The line of one entry. Its detail opens in a tree. */
function EntryLine({ entry, width, state }: { entry: Entry; width: number; state: OpenState }) {
	const key = getKey([entry])

	return (
		<EventLine
			entry={entry}
			text={entry.text}
			panel={
				entry.detail === undefined ? undefined : (
					<JsonTree data={entry.detail} collapsible={false} aria-label="Details" />
				)
			}
			width={width}
			open={state.isOpen(key)}
			onOpenChange={(next) => state.setOpen(key, next)}
		/>
	)
}

/** One row of the sheet: the line of one entry, or the summary of a batch, which opens to the lines of its entries. */
function EventRow({ row, width, state }: { row: Row; width: number; state: OpenState }) {
	if (row.length === 1) return <EntryLine entry={row[0]} width={width} state={state} />

	const key = getKey(row)

	return (
		<EventLine
			entry={row[0]}
			text={summaryOf(row)}
			panel={row.map((entry) => (
				<EntryLine key={keyOf(entry)} entry={entry} width={width} state={state} />
			))}
			width={width}
			open={state.isOpen(key)}
			onOpenChange={(next) => state.setOpen(key, next)}
		/>
	)
}

/**
 * The viewer of the Event log: the title, "Preserve", and "Batch", the lines,
 * newest first, Copy (oldest first, as text, with each detail), and Clear
 * while the log holds a line. With "Batch" on, the default, the entries of one
 * batch are one line that opens to their lines. The log records nothing while
 * the sheet is on screen.
 */
export function EventLogSheet({
	open,
	onOpenChange,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	const { log } = useDebug(open)

	// The closed sheet stays mounted, and it does not render for each new entry.
	// The open reads the current entries.
	const subscribe = open ? log.subscribe : noopSubscribe

	const entries = useSyncExternalStore(subscribe, () => log.entries)

	const preserve = useSyncExternalStore(subscribe, () => log.preserve)

	const batched = useSyncExternalStore(subscribe, () => log.batched)

	const rows = rowsOf(entries, batched)

	const width = kindWidth(entries)

	const { copied, copy } = useCopyButtonState({
		text: rows.map((row) => rowText(row, width)).join('\n'),
	})

	// The keys of the open lines. The list renders only the rows in view, so the
	// sheet keeps the open state of a row out of view.
	const [openKeys, setOpenKeys] = useState<ReadonlySet<string>>(() => new Set())

	const state: OpenState = {
		isOpen: (key) => openKeys.has(key),
		setOpen: (key, next) =>
			setOpenKeys((current) => {
				const keys = new Set(current)

				if (next) keys.add(key)
				else keys.delete(key)

				return keys
			}),
	}

	return (
		// The sheet takes the height of the log, up to the height of the screen.
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetPanel side="bottom" className="max-h-full">
				{/* The title row holds "Preserve" and "Batch" at its end. The row
				    takes the inset of the title, as the slot does. */}
				<Flex wrap align="center" gap="md" className={cn(dan.space.panel.x, dan.space.panel.top)}>
					<SheetTitle className="me-auto p-0">Event log</SheetTitle>
					<CheckboxField>
						<Checkbox
							checked={preserve}
							onChange={(event) => {
								log.preserve = event.target.checked
							}}
						/>
						<Label>Preserve</Label>
					</CheckboxField>
					<CheckboxField>
						<Checkbox
							checked={batched}
							onChange={(event) => {
								log.batched = event.target.checked
							}}
						/>
						<Label>Batch</Label>
					</CheckboxField>
				</Flex>
				<SheetBody className="min-h-0 flex-1 overflow-auto">
					{entries.length > 0 ? (
						// The list renders the lines in the view of the body, so a long log
						// opens as fast as a short one.
						<List
							items={rows.toReversed()}
							getKey={getKey}
							variant="plain"
							sortable={false}
							virtual
							aria-label="Events"
						>
							{(row) => (
								<ListItem>
									<EventRow row={row} width={width} state={state} />
								</ListItem>
							)}
						</List>
					) : (
						<Text tone="muted">No events</Text>
					)}
				</SheetBody>
				<SheetFooter className="justify-between">
					<Flex gap="sm">
						{/* The copied state of `CopyButton`, on a button with a text label. */}
						<Button size="sm" color={copied ? 'green' : undefined} onClick={() => void copy()}>
							{copied ? 'Copied' : 'Copy'}
						</Button>
						{entries.length > 0 && (
							<Button size="sm" color="amber" onClick={() => log.clear()}>
								Clear
							</Button>
						)}
					</Flex>
					<SheetClose />
				</SheetFooter>
			</SheetPanel>
		</Sheet>
	)
}
