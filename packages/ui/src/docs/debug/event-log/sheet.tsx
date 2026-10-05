import { useState, useSyncExternalStore } from 'react'
import { Button } from 'ui/button'
import { Checkbox, CheckboxField } from 'ui/checkbox'
import { Label } from 'ui/fieldset'
import { Flex } from 'ui/flex'
import { Sheet, SheetBody, SheetClose, SheetFooter, SheetTitle } from 'ui/sheet'
import { Text } from 'ui/text'
import { useCopyButtonState } from '../../../components/copy-button/use-copy-button-state.ts'
import { toggleItem } from '../../../utilities/toggle-item.ts'
import { Rail } from '../../kit/rail.tsx'
import { type Entry, KINDS, type Kind, start } from './recorder.ts'

/** One line of text: the time, the scroll position, the kind, and the text. */
function line({ time, kind, text, y }: Entry): string {
	return `${String(time).padStart(6)} y${String(y).padEnd(5)} ${kind.padEnd(8)} ${text}`
}

/**
 * The viewer of the Event log: "Preserve log" beside the title, a filter
 * button for each kind, the lines, newest first, Copy (oldest first, as text),
 * and Clear. With no lines, it says that the log is empty, or that the
 * filters hide each entry. The log records while the sheet is open, and skips
 * the events in the sheet.
 */
export function EventLogSheet({
	open,
	onOpenChange,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	const [log] = useState(start)

	const entries = useSyncExternalStore(log.subscribe, () => log.entries)

	const preserve = useSyncExternalStore(log.subscribe, () => log.preserve)

	const [hidden, setHidden] = useState<ReadonlySet<Kind>>(new Set())

	const lines = entries.filter((entry) => !hidden.has(entry.kind)).map(line)

	const { copied, copy } = useCopyButtonState({ text: lines.join('\n') })

	return (
		// The sheet takes the height of the log, up to the height of the screen.
		<Sheet side="bottom" open={open} onOpenChange={onOpenChange} className="max-h-full">
			{/* The log skips the events in this element (`OWN`). It takes no box. */}
			<div data-event-log="" className="contents">
				{/* The title and "Preserve log" share a row, so the title takes no padding of its own. */}
				<Flex justify="between" align="center" gap="md" className="px-6 pt-6">
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
				<SheetBody className="min-h-0 flex-1 space-y-3 overflow-auto">
					<Rail label="Kinds">
						{KINDS.map((kind) => (
							<Button
								key={kind}
								variant={hidden.has(kind) ? 'outline' : 'solid'}
								aria-pressed={!hidden.has(kind)}
								onClick={() => setHidden(toggleItem(hidden, kind))}
							>
								{kind}
							</Button>
						))}
					</Rail>
					{lines.length > 0 ? (
						<pre className="m-0 whitespace-pre-wrap font-mono text-xs">
							{lines.toReversed().join('\n')}
						</pre>
					) : (
						<Text tone="muted">
							{entries.length > 0 ? 'No events match your filters' : 'No events'}
						</Text>
					)}
				</SheetBody>
				<SheetFooter className="justify-between">
					<Flex gap="sm">
						{/* The copied state of `CopyButton`, on a button with a text label. */}
						<Button variant="soft" color={copied ? 'green' : undefined} onClick={() => void copy()}>
							{copied ? 'Copied' : 'Copy'}
						</Button>
						<Button variant="soft" onClick={() => log.clear()}>
							Clear
						</Button>
					</Flex>
					<SheetClose />
				</SheetFooter>
			</div>
		</Sheet>
	)
}
