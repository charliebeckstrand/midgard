import { useLayoutEffect, useState, useSyncExternalStore } from 'react'
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
 * The viewer of the Event log: a filter button for each kind and "Preserve
 * log", the lines, newest first, Copy (oldest first, as text), and Clear.
 * With no lines, it says that the log is empty, or that the filters hide each
 * entry. The log records nothing while the sheet is on screen.
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

	// A layout effect runs before the effect of the overlay that reports the
	// open, so the log does not record the open of this sheet.
	useLayoutEffect(() => {
		log.paused = open
	}, [log, open])

	return (
		// The sheet takes the height of the log, up to the height of the screen.
		<Sheet side="bottom" open={open} onOpenChange={onOpenChange} className="max-h-full">
			<SheetTitle>Event log</SheetTitle>
			<SheetBody className="min-h-0 flex-1 space-y-3 overflow-auto">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<Rail label="Kinds">
						{KINDS.map((kind) => (
							<Button
								key={kind}
								size="sm"
								variant={hidden.has(kind) ? 'outline' : 'solid'}
								aria-pressed={!hidden.has(kind)}
								onClick={() => setHidden(toggleItem(hidden, kind))}
							>
								{kind}
							</Button>
						))}
					</Rail>
					<CheckboxField className="shrink-0">
						<Checkbox
							checked={preserve}
							onChange={(event) => {
								log.preserve = event.target.checked
							}}
						/>
						<Label>Preserve log</Label>
					</CheckboxField>
				</div>
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
		</Sheet>
	)
}
