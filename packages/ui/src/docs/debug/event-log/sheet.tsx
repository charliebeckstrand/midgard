import { ChevronRight } from 'lucide-react'
import { useLayoutEffect, useState, useSyncExternalStore } from 'react'
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
import { getOrCompute } from '../../../utilities/get-or-compute.ts'
import { noopSubscribe } from '../../../utilities/noop.ts'
import { type Entry, KINDS, type Kind, start } from './recorder.ts'

/** The width of the kind column: the longest kind. */
const KIND_WIDTH = Math.max(...KINDS.map((kind) => kind.length))

/** The columns before the text of a line: the time, the scroll position, and the kind. */
function columns({ time, kind, y }: Entry): string {
	return `${String(time).padStart(6)} y${String(y).padEnd(5)} ${kind.padEnd(KIND_WIDTH)} `
}

/**
 * One entry as text: the columns, then the text. A detail follows as indented
 * JSON, each line under the start of the text.
 */
function line(entry: Entry): string {
	const head = columns(entry)

	if (entry.detail === undefined) return head + entry.text

	const indent = ' '.repeat(head.length)

	const detail = JSON.stringify(entry.detail, null, 2).replaceAll('\n', `\n${indent}`)

	return `${head}${entry.text}\n${indent}${detail}`
}

// The key of each line. An entry is an object that the log keeps until it
// drops the entry, so the key of a line stays while the line stays.
const keys = new WeakMap<Entry, number>()

let lastKey = 0

function keyOf(entry: Entry): number {
	return getOrCompute(keys, entry, () => ++lastKey)
}

/** The key of a line in the list. */
function getKey(entry: Entry): string {
	return String(keyOf(entry))
}

/** The color of the kinds that stand apart from the DOM events: the callbacks of the components and of the modules, and the errors. */
const COLOR: Partial<Record<Kind, string>> = {
	component: 'text-sky-600 dark:text-sky-400',
	module: 'text-violet-600 dark:text-violet-400',
	error: 'text-red-600 dark:text-red-400',
}

/**
 * One line of the sheet: the columns, the toggle of the detail, and the text.
 * The detail opens under the line, in a tree.
 */
function EventLine({
	entry,
	open,
	onOpenChange,
}: {
	entry: Entry
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	const { detail } = entry

	const text = (
		// A long text wraps in its own column, under the start of the text. Each
		// line keeps the slot of the toggle, so the texts start in one column. The
		// slot is one line high, so the toggle sits on the first line.
		<span className={cn('flex font-mono text-xs', COLOR[entry.kind])}>
			<span className="shrink-0 whitespace-pre">{columns(entry)}</span>
			<span className="flex size-4 shrink-0">
				{detail !== undefined && (
					<CollapseTrigger aria-label="Details" className="aria-expanded:*:rotate-90">
						<Icon icon={<ChevronRight />} size={12} />
					</CollapseTrigger>
				)}
			</span>
			<span className="min-w-0 wrap-break-word">{entry.text}</span>
		</span>
	)

	return (
		<ListItem>
			{detail === undefined ? (
				text
			) : (
				<Collapse open={open} onOpenChange={onOpenChange}>
					{text}
					<CollapsePanel>
						<JsonTree data={detail} defaultExpandDepth={2} aria-label="Details" />
					</CollapsePanel>
				</Collapse>
			)}
		</ListItem>
	)
}

/**
 * The viewer of the Event log: the title and "Preserve log", the lines, newest
 * first, Copy (oldest first, as text, with each detail), and Clear. With no
 * lines, it says that the log is empty. The log records nothing while the sheet
 * is on screen.
 */
export function EventLogSheet({
	open,
	onOpenChange,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	const [log] = useState(start)

	// The closed sheet stays mounted, and it does not render for each new entry.
	// The open reads the current entries.
	const subscribe = open ? log.subscribe : noopSubscribe

	const entries = useSyncExternalStore(subscribe, () => log.entries)

	const preserve = useSyncExternalStore(subscribe, () => log.preserve)

	const { copied, copy } = useCopyButtonState({ text: entries.map(line).join('\n') })

	// The keys of the lines with an open detail. The list renders only the lines
	// in view, so the sheet keeps the open state of a line out of view.
	const [openKeys, setOpenKeys] = useState<ReadonlySet<number>>(() => new Set())

	const setOpen = (key: number, next: boolean) =>
		setOpenKeys((current) => {
			const keys = new Set(current)

			if (next) keys.add(key)
			else keys.delete(key)

			return keys
		})

	// A layout effect runs before the effect of the overlay that reports the
	// open, so the log does not record the open of this sheet.
	useLayoutEffect(() => {
		log.paused = open
	}, [log, open])

	return (
		// The sheet takes the height of the log, up to the height of the screen.
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetPanel side="bottom" className="max-h-full">
				{/* The title row holds "Preserve log". The checkbox wraps under the
				    title only when the row has no room for both. The row takes the
				    inset of the title, as the slot does. */}
				<Flex
					wrap
					align="center"
					justify="between"
					gap="md"
					className={cn(dan.space.panel.x, dan.space.panel.top)}
				>
					<SheetTitle className="p-0">Event log</SheetTitle>
					<CheckboxField>
						<Checkbox
							checked={preserve}
							onChange={(event) => {
								log.preserve = event.target.checked
							}}
						/>
						<Label>Preserve log</Label>
					</CheckboxField>
				</Flex>
				<SheetBody className="min-h-0 flex-1 overflow-auto">
					{entries.length > 0 ? (
						// The list renders the lines in the view of the body, so a long log
						// opens as fast as a short one.
						<List
							items={entries.toReversed()}
							getKey={getKey}
							variant="plain"
							sortable={false}
							virtual
							aria-label="Events"
						>
							{(entry) => (
								<EventLine
									entry={entry}
									open={openKeys.has(keyOf(entry))}
									onOpenChange={(next) => setOpen(keyOf(entry), next)}
								/>
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
						<Button size="sm" color="amber" onClick={() => log.clear()}>
							Clear
						</Button>
					</Flex>
					<SheetClose />
				</SheetFooter>
			</SheetPanel>
		</Sheet>
	)
}
