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
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { Sheet, SheetBody, SheetClose, SheetFooter, SheetPanel, SheetTitle } from 'ui/sheet'
import { Text } from 'ui/text'
import { dan } from '../../../recipes/kiso/dan/index.ts'
import { iro } from '../../../recipes/kiso/iro/index.ts'
import { getOrCompute } from '../../../utilities/get-or-compute.ts'
import { noopSubscribe } from '../../../utilities/noop.ts'
import { type Entry, KINDS, type Kind } from './log.ts'
import { start } from './recorder.ts'

/** The shortest width of the kind column: the longest kind. */
const KIND_WIDTH = Math.max(...KINDS.map((kind) => kind.length))

/** What the kind column shows: the name of a component line, else the kind. */
function nameOf(entry: Entry): string {
	return entry.name ?? entry.kind
}

/** The width of the kind column: the longest kind, or the longest name in the log. */
function kindWidth(entries: readonly Entry[]): number {
	return entries.reduce((width, entry) => Math.max(width, nameOf(entry).length), KIND_WIDTH)
}

/** The columns before the text of a line: the time, the scroll position, and the kind or the name. */
function columns(entry: Entry, width: number): string {
	return `${String(entry.time).padStart(6)} y${String(entry.y).padEnd(5)} ${nameOf(entry).padEnd(width)} `
}

/**
 * One entry as text: the columns, then the text. A detail follows as indented
 * JSON, each line under the start of the text.
 */
function line(entry: Entry, width: number): string {
	const head = columns(entry, width)

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
 * The toggle holds the text, so a click on the text opens the detail under the
 * line, in a tree.
 */
function EventLine({
	entry,
	width,
	open,
	onOpenChange,
}: {
	entry: Entry
	/** The width of the kind column. */
	width: number
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	const { detail } = entry

	const color = COLOR[entry.kind]

	// Each line keeps the slot of the chevron, so the texts start in one column.
	// The slot is one line high, so the chevron sits on the first line. A long
	// text wraps in its own column, under the start of the text.
	const slot = (
		<span className="flex size-4 shrink-0 items-center">
			{detail !== undefined && <Icon icon={<ChevronRight />} size={12} />}
		</span>
	)

	const text = (
		<span className={cn('flex font-mono text-xs', color)}>
			<span className="shrink-0 whitespace-pre">{columns(entry, width)}</span>
			{detail === undefined ? (
				<>
					{slot}
					<span className="min-w-0 wrap-break-word">{entry.text}</span>
				</>
			) : (
				// The trigger gives its muted color to the chevron. The text keeps the
				// color of the line.
				<CollapseTrigger className="min-w-0 items-start gap-0 text-start text-xs aria-expanded:*:first:rotate-90">
					{slot}
					<span className={cn('min-w-0 wrap-break-word', color ?? iro.text.default)}>
						{entry.text}
					</span>
				</CollapseTrigger>
			)}
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
						<JsonTree data={detail} collapsible={false} aria-label="Details" />
					</CollapsePanel>
				</Collapse>
			)}
		</ListItem>
	)
}

/**
 * The viewer of the Event log: the title, "Preserve log", and a type filter,
 * the lines, newest first, Copy (oldest first, as text, with each detail), and
 * Clear. With no selected type, the sheet shows each type, and Copy copies the
 * lines that the sheet shows. With no lines, it says that the log is empty, or
 * that the filter hides each entry. The log records nothing while the sheet is
 * on screen.
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

	// The selected types. With no selected type, the sheet shows each type.
	const [kinds, setKinds] = useState<Kind[]>([])

	const shown = kinds.length === 0 ? entries : entries.filter((entry) => kinds.includes(entry.kind))

	const width = kindWidth(shown)

	const { copied, copy } = useCopyButtonState({
		text: shown.map((entry) => line(entry, width)).join('\n'),
	})

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
	// open, so the log does not record the open of this sheet. A sheet that
	// unmounts while it is open does not leave the log paused.
	useLayoutEffect(() => {
		log.paused = open

		return () => {
			log.paused = false
		}
	}, [log, open])

	return (
		// The sheet takes the height of the log, up to the height of the screen.
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetPanel side="bottom" className="max-h-full">
				{/* The title row holds "Preserve log" and the type filter at its end.
				    On a narrow screen, the filter takes a full row under the title and
				    the checkbox. The row takes the inset of the title, as the slot does. */}
				<Flex wrap align="center" gap="md" className={cn(dan.space.panel.x, dan.space.panel.top)}>
					<SheetTitle className="me-auto p-0">Event log</SheetTitle>
					<CheckboxField>
						<Checkbox
							checked={preserve}
							onChange={(event) => {
								log.preserve = event.target.checked
							}}
						/>
						<Label>Preserve log</Label>
					</CheckboxField>
					<Listbox<Kind>
						multiple
						aria-label="Types"
						placeholder="All types"
						value={kinds}
						onValueChange={setKinds}
						displayValue={(kind) => kind}
						capitalize={false}
						placement="bottom-end"
						className="w-full sm:w-fit sm:max-w-full"
					>
						{KINDS.map((kind) => (
							<ListboxOption key={kind} value={kind}>
								<ListboxLabel>{kind}</ListboxLabel>
							</ListboxOption>
						))}
					</Listbox>
				</Flex>
				<SheetBody className="min-h-0 flex-1 overflow-auto">
					{shown.length > 0 ? (
						// The list renders the lines in the view of the body, so a long log
						// opens as fast as a short one.
						<List
							items={shown.toReversed()}
							getKey={getKey}
							variant="plain"
							sortable={false}
							virtual
							aria-label="Events"
						>
							{(entry) => (
								<EventLine
									entry={entry}
									width={width}
									open={openKeys.has(keyOf(entry))}
									onOpenChange={(next) => setOpen(keyOf(entry), next)}
								/>
							)}
						</List>
					) : (
						<Text tone="muted">
							{entries.length > 0 ? 'No events of the selected types' : 'No events'}
						</Text>
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
